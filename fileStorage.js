var fs=require('fs');
var path=require('path');
var crypto=require('crypto');
var { StorageManager }=require('./storage');

var FILE_DB_PATH=path.join(__dirname,'data','files.json');
var ALLOWED_TYPES={
    'image/jpeg':{ext:'.jpg',category:'image'},
    'image/png':{ext:'.png',category:'image'},
    'image/gif':{ext:'.gif',category:'image'},
    'image/webp':{ext:'.webp',category:'image'},
    'application/pdf':{ext:'.pdf',category:'document'},
    'application/msword':{ext:'.doc',category:'document'},
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':{ext:'.docx',category:'document'},
    'text/plain':{ext:'.txt',category:'document'},
    'application/rtf':{ext:'.rtf',category:'document'}
};
var MAX_FILE_SIZE=20*1024*1024;

var storageManager=null;

function initStorage(){
    if(!fs.existsSync(path.dirname(FILE_DB_PATH))){
        fs.mkdirSync(path.dirname(FILE_DB_PATH),{recursive:true});
    }
    if(!fs.existsSync(FILE_DB_PATH)){
        fs.writeFileSync(FILE_DB_PATH,'[]','utf-8');
    }
    
    if(!storageManager){
        var config={
            storageType:process.env.STORAGE_TYPE||'local',
            uploadDir:path.join(__dirname,'data','uploads')
        };
        storageManager=new StorageManager(config);
    }
}

function loadFileDB(){
    try{
        return JSON.parse(fs.readFileSync(FILE_DB_PATH,'utf-8'));
    }catch(e){
        return [];
    }
}

function saveFileDB(db){
    var tmpPath=FILE_DB_PATH+'.tmp';
    try{
        fs.writeFileSync(tmpPath,JSON.stringify(db,null,2),'utf-8');
        fs.renameSync(tmpPath,FILE_DB_PATH);
    }catch(e){
        try{fs.unlinkSync(tmpPath);}catch(ignore){}
        throw e;
    }
}

function validateFile(fileInfo){
    if(!fileInfo.type||!ALLOWED_TYPES[fileInfo.type]){
        return {valid:false,error:'不支持的文件类型'};
    }
    if(fileInfo.size>MAX_FILE_SIZE){
        return {valid:false,error:'文件大小超过限制（最大20MB）'};
    }
    if(!fileInfo.name||fileInfo.name.trim().length===0){
        return {valid:false,error:'文件名不能为空'};
    }
    return {valid:true};
}

async function storeFile(fileData,fileInfo,contractId){
    initStorage();
    var validation=validateFile(fileInfo);
    if(!validation.valid){
        return {success:false,error:validation.error};
    }
    var fileId=crypto.randomUUID();
    var typeInfo=ALLOWED_TYPES[fileInfo.type];
    var base64Data=fileData;
    if(base64Data.indexOf('data:')===0){
        var commaIndex=base64Data.indexOf(',');
        if(commaIndex!==-1){
            base64Data=base64Data.substring(commaIndex+1);
        }
    }
    var buffer=Buffer.from(base64Data,'base64');

    // 实际大小验证
    if(buffer.length===0){
        return {success:false,error:'文件内容为空'};
    }
    if(buffer.length>MAX_FILE_SIZE){
        return {success:false,error:'文件大小超过限制（最大20MB）'};
    }
    // 用实际解码后的大小覆盖前端传来的大小
    fileInfo.size=buffer.length;

    // 图片类型魔术字节校验
    if(fileInfo.type&&fileInfo.type.startsWith('image/')){
        var magicValid=true;
        if(fileInfo.type==='image/jpeg'){
            magicValid=buffer.length>=2&&buffer[0]===0xFF&&buffer[1]===0xD8;
        }else if(fileInfo.type==='image/png'){
            magicValid=buffer.length>=4&&buffer[0]===0x89&&buffer[1]===0x50&&buffer[2]===0x4E&&buffer[3]===0x47;
        }else if(fileInfo.type==='image/gif'){
            magicValid=buffer.length>=3&&buffer[0]===0x47&&buffer[1]===0x49&&buffer[2]===0x46;
        }
        if(!magicValid){
            return {success:false,error:'文件内容与声明的类型不匹配'};
        }
    }

    var uploadResult=await storageManager.upload(fileId,buffer,{
        type:fileInfo.type,
        extension:typeInfo.ext
    });
    
    if(!uploadResult.success){
        return {success:false,error:uploadResult.error};
    }
    
    var fileRecord={
        id:fileId,
        contractId:contractId,
        originalName:fileInfo.name,
        type:fileInfo.type,
        category:typeInfo.category,
        extension:typeInfo.ext,
        size:buffer.length,
        storagePath:uploadResult.path||uploadResult.key,
        storageType:storageManager.getStorageType(),
        cdnUrl:uploadResult.url||null,
        uploadedAt:new Date().toISOString(),
        accessCount:0,
        lastAccessed:null
    };
    var db=loadFileDB();
    db.push(fileRecord);
    saveFileDB(db);
    return {success:true,file:fileRecord};
}

async function getFile(fileId){
    var db=loadFileDB();
    var file=db.find(function(f){return f.id===fileId;});
    if(!file)return null;
    var idx=db.findIndex(function(f){return f.id===fileId;});
    if(idx!==-1){
        db[idx].accessCount++;
        db[idx].lastAccessed=new Date().toISOString();
        saveFileDB(db);
    }
    var data=await storageManager.download(fileId,file.extension);
    if(!data)return null;
    return {record:file,data:data};
}

function getFilesByContract(contractId){
    var db=loadFileDB();
    return db.filter(function(f){return f.contractId===contractId;});
}

async function deleteFile(fileId){
    var db=loadFileDB();
    var idx=db.findIndex(function(f){return f.id===fileId;});
    if(idx===-1)return {success:false,error:'文件未找到'};
    var file=db[idx];
    await storageManager.delete(fileId,file.extension);
    db.splice(idx,1);
    saveFileDB(db);
    return {success:true};
}

async function deleteFilesByContract(contractId){
    var db=loadFileDB();
    var toDelete=db.filter(function(f){return f.contractId===contractId;});
    for(var i=0;i<toDelete.length;i++){
        var file=toDelete[i];
        await storageManager.delete(file.id,file.extension);
    }
    db=db.filter(function(f){return f.contractId!==contractId;});
    saveFileDB(db);
    return {success:true,deleted:toDelete.length};
}

function getStorageStats(){
    var db=loadFileDB();
    var totalSize=0;
    var categories={};
    var storageTypes={};
    db.forEach(function(f){
        totalSize+=f.size;
        if(!categories[f.category])categories[f.category]=0;
        categories[f.category]++;
        var st=f.storageType||'local';
        if(!storageTypes[st])storageTypes[st]=0;
        storageTypes[st]++;
    });
    return {
        totalFiles:db.length,
        totalSize:totalSize,
        categories:categories,
        storageTypes:storageTypes
    };
}

async function getFileUrl(fileId){
    var db=loadFileDB();
    var file=db.find(function(f){return f.id===fileId;});
    if(!file)return null;
    return await storageManager.getUrl(fileId,file.extension);
}

function updateFileContractId(fileId,contractId){
    var db=loadFileDB();
    var idx=db.findIndex(function(f){return f.id===fileId;});
    if(idx===-1)return {success:false,error:'文件未找到'};
    db[idx].contractId=contractId;
    saveFileDB(db);
    return {success:true};
}

initStorage();

module.exports={
    storeFile:storeFile,
    getFile:getFile,
    getFilesByContract:getFilesByContract,
    deleteFile:deleteFile,
    deleteFilesByContract:deleteFilesByContract,
    getStorageStats:getStorageStats,
    getFileUrl:getFileUrl,
    updateFileContractId:updateFileContractId,
    ALLOWED_TYPES:ALLOWED_TYPES,
    MAX_FILE_SIZE:MAX_FILE_SIZE
};