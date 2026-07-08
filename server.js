require("dotenv").config();
var fs=require("fs"),http=require("http"),path=require("path"),crypto=require("crypto"),url=require("url");
var PORT=process.env.PORT||3000;
var DAPI=process.env.DEEPSEEK_API_KEY||"";
var USE_LOCAL_PADDLE_OCR=process.env.USE_LOCAL_PADDLE_OCR==="true";
var PADDLE_OCR_URL=process.env.PADDLE_OCR_URL||"http://localhost:8866/api/ocr";
var USE_OCR_MOCK=!USE_LOCAL_PADDLE_OCR;
var USE_ANALYZE_MOCK=(!DAPI||DAPI.length<10);

var serpApi;
try {
  serpApi = require('./serpapi');
} catch (e) {
  console.log('SerpAPI 模块加载失败:', e.message);
  serpApi = null;
}

var mammoth;
try {
  mammoth = require('mammoth');
} catch (e) {
  console.log('mammoth模块加载失败:', e.message);
  mammoth = null;
}

var ragEmbeddingService = null;
var ragVectorStore = null;

async function initRagInfrastructure() {
  try {
    var EmbeddingService = require('./rag/embeddingService');
    ragEmbeddingService = new EmbeddingService();
    await ragEmbeddingService.init();
    var VectorStore = require('./rag/vectorStore');
    ragVectorStore = new VectorStore(ragEmbeddingService);
    console.log('[RAG] Embedding + VectorStore 初始化完成');
  } catch (e) {
    console.log('[RAG] Embedding 初始化失败，降级为关键词检索:', e.message);
    ragEmbeddingService = null;
    ragVectorStore = null;
  }
}

var ragApi;
try {
  ragApi = require('./rag/ragApi');
} catch (e) {
  console.log('RAG模块加载失败:', e.message);
  ragApi = null;
}

var reactApi;
try {
  var ReActApi = require('./react/ReActApi');
  reactApi = new ReActApi();
} catch (e) {
  console.log('ReAct模块加载失败:', e.message);
  reactApi = null;
}

var fileStorage;
try {
  fileStorage = require('./fileStorage');
} catch (e) {
  console.log('文件存储模块加载失败:', e.message);
  fileStorage = null;
}

var riskAssessment;
try {
  riskAssessment = require('./riskAssessment');
} catch (e) {
  console.log('风险评估模块加载失败:', e.message);
  riskAssessment = null;
}

var PUB=path.join(__dirname,"public"),DAT=path.join(__dirname,"data"),CF=path.join(DAT,"contracts.json");
var MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon"};
if(!fs.existsSync(DAT))fs.mkdirSync(DAT,{recursive:true});
if(!fs.existsSync(CF))fs.writeFileSync(CF,"[]","utf-8");
function rc(){try{return JSON.parse(fs.readFileSync(CF,"utf-8"));}catch{return[];}}function wc(c){fs.writeFileSync(CF,JSON.stringify(c,null,2),"utf-8");}
function readFileUTF8(fp){try{return fs.readFileSync(fp,"utf-8");}catch(e){console.error("读取文件失败:",e.message);return"";}}
function writeFileUTF8(fp,content){try{fs.writeFileSync(fp,content,"utf-8");}catch(e){console.error("写入文件失败:",e.message);}}
function cf(t){t=t.toLowerCase();
if(new RegExp("租赁|房东|押金|租金").test(t))return{category:"租赁合同",icon:"🏠"};
if(new RegExp("劳动|工资|加班|社保|五险一金|试用期").test(t))return{category:"劳动合同",icon:"💼"};
if(new RegExp("购房|房产|定金|首付|产权").test(t))return{category:"购房协议",icon:"🏡"};
if(new RegExp("服务|条款|协议|注册").test(t))return{category:"服务条款",icon:"📋"};
if(new RegExp("借款|贷款|利息|担保").test(t))return{category:"借款合同",icon:"💰"};
return{category:"其他合同",icon:"📄"};
}

function generateContractDraft(data){
  var type=data.type,partyA=data.partyA,partyB=data.partyB,intent=data.intent,details=data.details||"";
  var today=new Date();
  var dateStr=String(today.getFullYear())+"年"+String(today.getMonth()+1)+"月"+String(today.getDate())+"日";
  var contract="";
  if(type==="租赁合同"){
    contract="# "+partyA+" 与 "+partyB+" 房屋租赁合同\n\n";
    contract+="## 第一条 合同主体\n\n";
    contract+="甲方（出租方）："+partyA+"\n";
    contract+="乙方（承租方）："+partyB+"\n\n";
    contract+="## 第二条 房屋概况\n\n";
    contract+="甲方将位于 [具体地址] 的房屋出租给乙方使用。\n\n";
    contract+="## 第三条 租赁期限\n\n";
    contract+="租赁期限自 [起始日期] 起至 [结束日期] 止。\n\n";
    contract+="## 第四条 租金及支付方式\n\n";
    contract+="1. 每月租金为人民币 [金额] 元整。\n";
    contract+="2. 支付方式：[支付方式]，首期租金应于 [日期] 前支付。\n\n";
    contract+="## 第五条 押金\n\n";
    contract+="乙方应向甲方支付押金人民币 [金额] 元整，作为履约保证金。租赁期满且乙方无违约时，甲方应全额退还押金（不计利息）。\n\n";
    contract+="## 第六条 双方权利义务\n\n";
    contract+="### 甲方权利义务\n";
    contract+="1. 按照约定时间向乙方交付房屋；\n";
    contract+="2. 保证房屋及附属设施正常使用；\n";
    contract+="3. 负责房屋主体结构的维修。\n\n";
    contract+="### 乙方权利义务\n";
    contract+="1. 按时足额支付租金及各项费用；\n";
    contract+="2. 爱护房屋及附属设施，合理使用；\n";
    contract+="3. 不得擅自转租、改变房屋结构。\n\n";
    contract+="## 第七条 合同解除\n\n";
    contract+="1. 双方协商一致，可以解除合同；\n";
    contract+="2. 一方严重违约，另一方有权单方解除合同；\n";
    contract+="3. 因不可抗力导致合同无法继续履行的。\n\n";
    contract+="## 第八条 违约责任\n\n";
    contract+="1. 一方违约，应承担相应的违约责任；\n";
    contract+="2. 违约金数额应与实际损失相当，不得超过合同总金额的30%。\n\n";
    contract+="## 第九条 争议解决\n\n";
    contract+="本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，任何一方可向房屋所在地人民法院提起诉讼。\n\n";
  }else if(type==="劳动合同"){
    contract="# "+partyA+" 与 "+partyB+" 劳动合同\n\n";
    contract+="## 第一条 合同主体\n\n";
    contract+="甲方（用人单位）："+partyA+"\n";
    contract+="乙方（劳动者）："+partyB+"\n\n";
    contract+="## 第二条 合同期限\n\n";
    contract+="本合同为[固定/无固定]期限劳动合同，自 [起始日期] 起至 [结束日期] 止。试用期自 [起始日期] 起至 [结束日期] 止，试用期工资为人民币 [金额] 元。\n\n";
    contract+="## 第三条 工作内容和工作地点\n\n";
    contract+="1. 乙方同意根据甲方工作需要，在 [工作地点] 担任 [岗位名称] 工作；\n";
    contract+="2. 甲方可以根据经营需要调整乙方的工作岗位。\n\n";
    contract+="## 第四条 工作时间和休息休假\n\n";
    contract+="1. 实行 [标准工时/综合计算工时/不定时] 工作制；\n";
    contract+="2. 乙方依法享有法定节假日、年休假等休息休假权利。\n\n";
    contract+="## 第五条 劳动报酬\n\n";
    contract+="1. 乙方月工资为人民币 [金额] 元整；\n";
    contract+="2. 工资支付日期为每月 [日期] 日；\n";
    contract+="3. 甲方依法为乙方缴纳社会保险和住房公积金。\n\n";
    contract+="## 第六条 劳动保护和工作条件\n\n";
    contract+="甲方应提供符合国家规定的劳动安全卫生条件和必要的劳动保护用品。\n\n";
    contract+="## 第七条 劳动合同的解除和终止\n\n";
    contract+="双方应按照《中华人民共和国劳动合同法》的规定执行。\n\n";
    contract+="## 第八条 劳动争议处理\n\n";
    contract+="发生劳动争议，双方可以协商解决；也可以向劳动争议仲裁委员会申请仲裁。\n\n";
  }else if(type==="服务合同"){
    contract="# "+partyA+" 与 "+partyB+" 服务合同\n\n";
    contract+="## 第一条 合同主体\n\n";
    contract+="甲方（服务提供方）："+partyA+"\n";
    contract+="乙方（服务接受方）："+partyB+"\n\n";
    contract+="## 第二条 服务内容\n\n";
    contract+="甲方同意为乙方提供以下服务：[具体服务内容]\n\n";
    contract+="## 第三条 服务期限\n\n";
    contract+="服务期限自 [起始日期] 起至 [结束日期] 止。\n\n";
    contract+="## 第四条 服务费用及支付方式\n\n";
    contract+="1. 服务费用总计为人民币 [金额] 元整；\n";
    contract+="2. 支付方式：[支付方式]。\n\n";
    contract+="## 第五条 双方权利义务\n\n";
    contract+="### 甲方权利义务\n";
    contract+="1. 按照约定提供服务；\n";
    contract+="2. 保证服务质量；\n";
    contract+="3. 对知悉的乙方商业秘密负有保密义务。\n\n";
    contract+="### 乙方权利义务\n";
    contract+="1. 按时支付服务费用；\n";
    contract+="2. 为甲方提供必要的工作条件；\n";
    contract+="3. 按照约定接受服务。\n\n";
    contract+="## 第六条 违约责任\n\n";
    contract+="任何一方违反本合同约定，应承担相应的违约责任。\n\n";
  }else if(type==="借款合同"){
    contract="# "+partyA+" 与 "+partyB+" 借款合同\n\n";
    contract+="## 第一条 合同主体\n\n";
    contract+="甲方（出借人）："+partyA+"\n";
    contract+="乙方（借款人）："+partyB+"\n\n";
    contract+="## 第二条 借款金额\n\n";
    contract+="甲方向乙方提供借款人民币 [金额] 元整。\n\n";
    contract+="## 第三条 借款用途\n\n";
    contract+="借款用途为：[具体用途]\n\n";
    contract+="## 第四条 借款期限\n\n";
    contract+="借款期限自 [起始日期] 起至 [结束日期] 止。\n\n";
    contract+="## 第五条 借款利率及利息支付\n\n";
    contract+="1. 双方约定年利率为 [利率]%；\n";
    contract+="2. 利息支付方式：[支付方式]；\n";
    contract+="3. 利率不得超过合同成立时一年期贷款市场报价利率（LPR）的四倍。\n\n";
    contract+="## 第六条 还款方式\n\n";
    contract+="乙方应于 [还款日期] 前将本金及利息一次性支付给甲方。\n\n";
    contract+="## 第七条 违约责任\n\n";
    contract+="1. 乙方逾期还款的，应承担相应的违约责任；\n";
    contract+="2. 甲方有权要求乙方支付逾期利息。\n\n";
    contract+="## 第八条 争议解决\n\n";
    contract+="发生争议，双方应友好协商解决；协商不成的，向甲方所在地人民法院提起诉讼。\n\n";
  }else{
    contract="# "+partyA+" 与 "+partyB+" 合同\n\n";
    contract+="## 第一条 合同主体\n\n";
    contract+="甲方："+partyA+"\n";
    contract+="乙方："+partyB+"\n\n";
    contract+="## 第二条 合同目的\n\n";
    contract+="双方经友好协商，达成以下协议。\n\n";
    contract+="## 第三条 双方权利义务\n\n";
    contract+="### 甲方权利义务\n";
    contract+="1. [甲方权利1]\n";
    contract+="2. [甲方义务1]\n\n";
    contract+="### 乙方权利义务\n";
    contract+="1. [乙方权利1]\n";
    contract+="2. [乙方义务1]\n\n";
    contract+="## 第四条 违约责任\n\n";
    contract+="任何一方违反本合同约定，应承担相应的违约责任。\n\n";
  }
  contract+="## 第十条 其他约定\n\n";
  if(details){
    contract+="其他特别约定："+details+"\n\n";
  }
  contract+="## 第十一条 生效条款\n\n";
  contract+="本合同自双方签字盖章之日起生效。本合同一式两份，双方各执一份，具有同等法律效力。\n\n";
  contract+="甲方（签字/盖章）：\n\n";
  contract+="日期："+dateStr+"\n\n";
  contract+="乙方（签字/盖章）：\n\n";
  contract+="日期："+dateStr+"\n";
  return contract;
}

function mt(t,a){if(a&&a.summary){var s=a.summary;return s.length>36?s.slice(0,34)+"...":s;}var ls=t.split("\n").filter(function(l){return l.trim();});var f=ls[0]||"";return f.length>40?f.slice(0,38)+"...":f;}
function mp(pt,pn){var ps=pt.split("/"),as=pn.split("/");if(ps.length!==as.length)return null;var par={};for(var i=0;i<ps.length;i++){if(ps[i].startsWith(":"))par[ps[i].slice(1)]=decodeURIComponent(as[i]);else if(ps[i]!==as[i])return null;}return par;}
function ss(res,fp){var ex=path.extname(fp);fs.readFile(fp,"utf-8",function(err,data){if(err){res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});res.end("404");return;}res.writeHead(200,{"Content-Type":MIME[ex]||"application/octet-stream"});res.end(data);});}
function pb(req){return new Promise(function(resolve,reject){var b="";req.on("data",function(c){b+=c;});req.on("end",function(){try{resolve(JSON.parse(b));}catch{reject(new Error("Invalid JSON"));}});req.on("error",reject);});}

async function enhancedContractAnalysis(contractText){
  var legalReferences="";
  if(serpApi&&serpApi.hasApiKey){
    try{
      var searchResult=await serpApi.searchLegalInfo("民法典 格式条款 违约金 霸王条款");
      if(searchResult.results&&searchResult.results.length>0){
        legalReferences="\n\n【相关法律参考】\n";
        for(var i=0;i<Math.min(searchResult.results.length,3);i++){
          legalReferences+="- "+(searchResult.results[i].title||"")+"\n";
          if(searchResult.results[i].snippet){
            legalReferences+="  "+searchResult.results[i].snippet.substring(0,150)+"...\n";
          }
        }
      }
    }catch(e){console.log("法律搜索失败:",e.message);}
  }
  var ragKnowledge="";
  if(ragVectorStore){
    try{
      var searchResult=await ragVectorStore.search(contractText.substring(0,500),{limit:5});
      if(searchResult.results&&searchResult.results.length>0){
        ragKnowledge="\n\n【知识库参考】("+(searchResult.mode||'keyword')+")\n";
        for(var i=0;i<searchResult.results.length;i++){
          ragKnowledge+="- ["+(searchResult.results[i].source||'keyword')+" "+searchResult.results[i].score+"] "+searchResult.results[i].content.substring(0,100)+"\n";
        }
      }
    }catch(e){console.log("RAG搜索失败:",e.message);}
  }
  var systemPrompt="你是【一纸穿透】AI法务导师，精通《民法典》和合同法律实务。你的任务是分析合同文本，找出真正的霸王条款（格式条款）。\n\n【分析原则】\n1. 严谨原则：不要随便把正常商业条款标记为霸王条款\n2. 证据原则：每个结论都要有法律依据（引用具体法条）\n3. 语境原则：必须结合整个合同上下文判断，不能只看单个句子\n4. 中立原则：如果条款有争议但可能合法，标记为\"需注意\"而非\"霸王条款\"\n\n【霸王条款判断标准】\n1. 格式条款（重复使用且未协商）\n2. 不合理免除或减轻己方责任\n3. 不合理加重对方责任\n4. 不合理排除或限制对方主要权利\n5. 违反公平原则\n\n【民法典相关法条参考】\n- 第496条：格式条款定义、提供者提示说明义务\n- 第497条：格式条款无效的情形\n- 第498条：格式条款解释规则\n- 第585条：违约金过高调整规则\n- 第716条：转租条款\n"+legalReferences+"\n"+ragKnowledge+"\n\n【输出格式】\n{\n  \"overall_risk\":\"high/medium/low\",\n  \"risk_score\":0-100,\n  \"summary\":\"整体风险评估\",\n  \"clauses\": [\n    {\n      \"type\":\"霸王条款/需注意/正常条款\",\n      \"risk_level\":\"high/medium/low/none\",\n      \"clause\":\"条款原文\",\n      \"is_false_positive\":false,\n      \"explanation\":\"基于法律和上下文的分析\",\n      \"legal_basis\":\"引用相关法律条文\",\n      \"counter_script\":\"协商话术\",\n      \"recommended_fix\":\"建议修改方案\"\n    }\n  ],\n  \"battle_plan\": [{\"step\":\"1\",\"action\":\"\",\"detail\":\"\",\"script\":\"\"}],\n  \"key_takeaway\":\"\",\n  \"positive_points\": [\"合同中合理的地方\"]\n}\n\n【注意事项】\n- is_false_positive: 如果本来正常但可能被误判的条款，设为 true\n- positive_points: 列出合同中做得好的地方\n- 每个霸王条款必须有明确的法律依据\n- 只有明显不公平的条款才标记为\"霸王条款\"\n\n现在分析这份合同：";
  var response=await fetch("https://api.deepseek.com/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+DAPI},
    body:JSON.stringify({
      model:"deepseek-chat",
      messages:[{role:"system",content:systemPrompt},{role:"user",content:"请分析这份合同：\n\n"+contractText}],
      temperature:0.3,
      max_tokens:3000
    })
  });
  var data=await response.json();
  if(!data.choices||data.choices.length===0)throw new Error("API返回异常");
  var content=data.choices[0].message.content;
  var jsonMatch=content.match(/\{[\s\S]*\}/);
  if(jsonMatch)content=jsonMatch[0];
  var parsed;
  try{parsed=JSON.parse(content);}catch(e){
    return {overall_risk:"low",risk_score:25,summary:"分析完成，未发现明显霸王条款",clauses:[],battle_plan:[],key_takeaway:"建议仔细阅读合同",positive_points:["未发现明显风险条款"]};
  }
  // ===== 联网验证高风险条款 =====
  parsed.online_verification=[];
  if(serpApi&&serpApi.hasApiKey){
    var highRiskClauses=(parsed.clauses||[]).filter(function(c){return c.risk_level==="high"||c.risk_level==="高危";}).slice(0,3);
    for(var vi=0;vi<highRiskClauses.length;vi++){
      var clause=highRiskClauses[vi];
      var keyword=(clause.clause||"").substring(0,20);
      if(!keyword)continue;
      try{
        var searchQuery="民法典 "+keyword+" "+(clause.type||"");
        var verifyResult=await serpApi.searchLegalInfo(searchQuery);
        if(verifyResult.results&&verifyResult.results.length>0){
          parsed.online_verification.push({
            clause_index:(parsed.clauses||[]).indexOf(clause),
            keyword:keyword,
            query:searchQuery,
            results:verifyResult.results.slice(0,2).map(function(r){return{title:r.title||"",snippet:r.snippet?r.snippet.substring(0,200):"",link:r.link||""};}),
            verified:true
          });
        }
      }catch(e){console.log("[VERIFY] 联网验证失败:",e.message);}
    }
  }
  return parsed;
}

var server=http.createServer(async function(req,res){
  var pu=url.parse(req.url,true),pn=pu.pathname;
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS"){res.writeHead(204);res.end();return;}

  if(ragApi){
    if(pn==="/api/rag/analyze"&&req.method==="POST"){await ragApi.handleEnhancedAnalysis(req,res,pb);return;}
    if(pn==="/api/rag/search"&&req.method==="POST"){await ragApi.handleKnowledgeSearch(req,res,pb,pu);return;}
    if(pn==="/api/rag/add"&&req.method==="POST"){await ragApi.handleAddKnowledge(req,res,pb);return;}
    if(pn==="/api/rag/status"&&req.method==="GET"){ragApi.handleKnowledgeStatus(req,res);return;}
  }

  if(reactApi){
    if(pn==="/api/react/analyze"&&req.method==="POST"){await reactApi.handleAnalyzeWithReAct(req,res,pb);return;}
    if(pn==="/api/react/trace"&&req.method==="GET"){reactApi.handleGetTrace(req,res);return;}
    if(pn==="/api/react/feedback"&&req.method==="GET"){reactApi.handleGetFeedback(req,res,pu);return;}
    if(pn==="/api/react/feedback"&&req.method==="POST"){await reactApi.handleSubmitFeedback(req,res,pb);return;}
    if(pn==="/api/react/status"&&req.method==="GET"){reactApi.handleGetStatus(req,res);return;}
    if(pn==="/api/react/reset"&&req.method==="POST"){reactApi.handleReset(req,res);return;}
  }

  if(pn==="/api/contract/draft"&&req.method==="POST"){
    try{
      var bd=await pb(req);
      if(!bd.type||!bd.partyA||!bd.partyB||!bd.intent){
        res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"请填写完整信息：合同类型、甲乙双方、合同意图"}));
        return;
      }
      var draft=generateContractDraft(bd);
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({success:true,contract:draft}));
    }catch(err){
      console.error("Draft error:",err);
      res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({error:"生成失败: "+err.message}));
    }
    return;
  }

  if(pn==="/api/files/extract-text"&&req.method==="POST"){
    try{
      var bd=await pb(req);
      if(!bd.fileData||!bd.fileInfo){
        res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"缺少文件数据"}));
        return;
      }
      var base64Data=bd.fileData;
      if(base64Data.indexOf("data:")===0){
        var commaIndex=base64Data.indexOf(",");
        if(commaIndex!==-1) base64Data=base64Data.substring(commaIndex+1);
      }
      var buffer=Buffer.from(base64Data,"base64");
      var extractedText="";
      if(bd.fileInfo.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"||bd.fileInfo.name.endsWith(".docx")){
        if(!mammoth){
          res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
          res.end(JSON.stringify({error:"docx解析模块未安装"}));
          return;
        }
        var result=await mammoth.extractRawText({buffer:buffer});
        extractedText=result.value;
      }else if(bd.fileInfo.type==="text/plain"||bd.fileInfo.name.endsWith(".txt")){
        extractedText=buffer.toString("utf-8");
      }else{
        res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"不支持的文件格式，仅支持docx和txt"}));
        return;
      }
      if(extractedText.length<10){
        res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"提取的文本内容太少，请检查文件内容"}));
        return;
      }
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({success:true,text:extractedText.substring(0,50000)}));
    }catch(err){
      console.error("Extract text error:",err);
      res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({error:"文本提取失败: "+err.message}));
    }
    return;
  }

  if(serpApi){
    if(pn==="/api/web/search"&&req.method==="POST"){
      try{
        var bd=await pb(req);
        var query=bd.query;
        if(!query||query.trim().length<2){
          res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
          res.end(JSON.stringify({error:"搜索关键词不能为空"}));
          return;
        }
        var result=await serpApi.searchWeb(query,bd.options);
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify(result));
      }catch(err){
        console.error("Web Search error:",err);
        res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"搜索失败: "+err.message}));
      }
      return;
    }
    if(pn==="/api/web/search/legal"&&req.method==="POST"){
      try{
        var bd=await pb(req);
        var query=bd.query;
        if(!query||query.trim().length<2){
          res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
          res.end(JSON.stringify({error:"搜索关键词不能为空"}));
          return;
        }
        var result=await serpApi.searchLegalInfo(query);
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify(result));
      }catch(err){
        console.error("Legal Search error:",err);
        res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"搜索失败: "+err.message}));
      }
      return;
    }
  }

  if(pn==="/api/memory/categories"&&req.method==="GET"){
    var cts=rc(),st={};
    cts.forEach(function(c){
      var cat=c.category||"其他合同";
      if(!st[cat])st[cat]={category:cat,icon:c.categoryIcon||"📄",count:0,highRisk:0};
      st[cat].count++;
      if(c.riskLevel==="高")st[cat].highRisk++;
    });
    res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
    res.end(JSON.stringify({categories:Object.values(st),total:cts.length}));
    return;
  }

  if(pn==="/api/memory/contracts"&&req.method==="GET"){
    var cts=rc(),q=pu.query;
    if(q.search){
      var sq=q.search.toLowerCase();
      cts=cts.filter(function(c){
        return (c.title||"").toLowerCase().includes(sq)||
               (c.originalText||"").toLowerCase().includes(sq)||
               (c.category||"").toLowerCase().includes(sq);
      });
    }
    if(q.category)cts=cts.filter(function(c){return c.category===q.category;});
    if(q.risk)cts=cts.filter(function(c){return c.riskLevel===q.risk;});
    var list=cts.map(function(c){
      return{id:c.id,title:c.title,category:c.category,categoryIcon:c.categoryIcon,
             riskLevel:c.riskLevel,riskScore:c.riskScore,clauseCount:c.clauseCount,
             summary:c.summary,createdAt:c.createdAt,updatedAt:c.updatedAt,
             fileIds:c.fileIds||[]};
    });
    res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
    res.end(JSON.stringify(list));
    return;
  }

  var gp=mp("/api/memory/contracts/:id",pn);
  if(gp&&req.method==="GET"){
    var cts=rc(),ct=cts.find(function(c){return c.id===gp.id;});
    if(!ct){res.writeHead(404);res.end(JSON.stringify({error:"合同未找到"}));return;}
    res.writeHead(200);res.end(JSON.stringify(ct));
    return;
  }

  if(pn==="/api/memory/contracts"&&req.method==="POST"){
    try{
      var bd=await pb(req),tx=bd.text;
      if(!tx||tx.trim().length<10){
        res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"合同文本太短"}));
        return;
      }
      var cls=cf(tx);
      var finalRisk={level:'medium',score:50,validation:null};
      if(riskAssessment&&bd.analysisResult){
        finalRisk=riskAssessment.crossValidateRisk(bd.analysisResult,tx);
      }
      var ct={
        id:crypto.randomUUID(),
        title:mt(tx,bd.analysisResult),
        originalText:tx,
        analysisResult:bd.analysisResult||null,
        category:cls.category,
        categoryIcon:cls.icon,
        riskLevel:riskAssessment?riskAssessment.getRiskLabel(finalRisk.finalLevel):
                 (bd.analysisResult&&bd.analysisResult.overall_risk==="high"?"高":
                  (bd.analysisResult&&(bd.analysisResult.overall_risk==="low"||(!bd.analysisResult.clauses||bd.analysisResult.clauses.length===0))?"低":"中")),
        riskScore:finalRisk.finalScore||(bd.analysisResult&&bd.analysisResult.risk_score||50),
        clauseCount:bd.analysisResult&&bd.analysisResult.clauses&&bd.analysisResult.clauses.length||0,
        summary:bd.analysisResult&&bd.analysisResult.summary||"",
        riskValidation:finalRisk.validation||null,
        needsReview:finalRisk.needsReview||false,
        fileIds:bd.fileIds||[],
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };
      var cts=rc();
      cts.unshift(ct);
      wc(cts);
      if(fileStorage&&bd.fileIds&&bd.fileIds.length>0){
        for(var fi=0;fi<bd.fileIds.length;fi++){
          try{fileStorage.updateFileContractId(bd.fileIds[fi],ct.id);}catch(e){console.log("更新文件关联失败:",e.message);}
        }
      }
      res.writeHead(201,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify(ct));
    }catch(err){
      res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({error:"保存失败: "+err.message}));
    }
    return;
  }

  var pp=mp("/api/memory/contracts/:id",pn);
  if(pp&&req.method==="PUT"){
    try{
      var bd=await pb(req),cts=rc(),idx=cts.findIndex(function(c){return c.id===pp.id;});
      if(idx===-1){res.writeHead(404);res.end(JSON.stringify({error:"合同未找到"}));return;}
      ["title","category","categoryIcon"].forEach(function(k){if(bd[k]!==undefined)cts[idx][k]=bd[k];});
      cts[idx].updatedAt=new Date().toISOString();
      wc(cts);
      res.writeHead(200);res.end(JSON.stringify(cts[idx]));
    }catch(err){
      res.writeHead(500);res.end(JSON.stringify({error:"更新失败: "+err.message}));
    }
    return;
  }

  var dp=mp("/api/memory/contracts/:id",pn);
  if(dp&&req.method==="DELETE"){
    try{
      var cts=rc(),idx=cts.findIndex(function(c){return c.id===dp.id;});
      if(idx===-1){res.writeHead(404);res.end(JSON.stringify({error:"合同未找到"}));return;}
      var contractToDelete=cts[idx];
      if(fileStorage&&contractToDelete.fileIds&&contractToDelete.fileIds.length>0){
        for(var i=0;i<contractToDelete.fileIds.length;i++){
          await fileStorage.deleteFile(contractToDelete.fileIds[i]);
        }
      }
      cts.splice(idx,1);
      wc(cts);
      res.writeHead(200);res.end(JSON.stringify({success:true}));
    }catch(err){
      res.writeHead(500);res.end(JSON.stringify({error:"删除失败: "+err.message}));
    }
    return;
  }

  if(pn==="/api/memory/export"&&req.method==="GET"){
    var cts=rc(),ed=cts.map(function(c){
      return{title:c.title,category:c.category,riskLevel:c.riskLevel,
             riskScore:c.riskScore,clauseCount:c.clauseCount,
             summary:c.summary,createdAt:c.createdAt};
    });
    res.writeHead(200,{"Content-Type":"application/json; charset=utf-8",
                        "Content-Disposition":"attachment; filename=\"contracts-export.json\""});
    res.end(JSON.stringify(ed,null,2));
    return;
  }

  if(fileStorage){
    if(pn==="/api/files/upload"&&req.method==="POST"){
      try{
        var bd=await pb(req);
        if(!bd.fileData||!bd.fileInfo){
          res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
          res.end(JSON.stringify({error:"缺少文件数据"}));
          return;
        }
        var result=await fileStorage.storeFile(bd.fileData,bd.fileInfo,bd.contractId||null);
        if(!result.success){
          res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
          res.end(JSON.stringify({error:result.error}));
          return;
        }
        res.writeHead(201,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify(result.file));
        return;
      }catch(err){
        res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"上传失败: "+err.message}));
        return;
      }
    }
    var fgp=mp("/api/files/:id",pn);
    if(fgp&&req.method==="GET"){
      var file=await fileStorage.getFile(fgp.id);
      if(!file){res.writeHead(404,{"Content-Type":"application/json; charset=utf-8"});
                 res.end(JSON.stringify({error:"文件未找到"}));return;}
      res.writeHead(200,{"Content-Type":file.record.type});res.end(file.data);
      return;
    }
    var fcp=mp("/api/files/contract/:contractId",pn);
    if(fcp&&req.method==="GET"){
      var files=fileStorage.getFilesByContract(fcp.contractId);
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify(files));
      return;
    }
    var fdp=mp("/api/files/:id",pn);
    if(fdp&&req.method==="DELETE"){
      var result=await fileStorage.deleteFile(fdp.id);
      if(!result.success){
        res.writeHead(404,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:result.error}));
        return;
      }
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify(result));
      return;
    }
    if(pn==="/api/files/stats"&&req.method==="GET"){
      var stats=fileStorage.getStorageStats();
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify(stats));
      return;
    }
  }

  if(riskAssessment){
    if(pn==="/api/risk/assess"&&req.method==="POST"){
      try{
        var bd=await pb(req);
        var result=riskAssessment.calculateRiskScore(bd.analysisResult);
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify(result));
        return;
      }catch(err){
        res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"评估失败: "+err.message}));
        return;
      }
    }
    if(pn==="/api/risk/validate"&&req.method==="POST"){
      try{
        var bd=await pb(req);
        var result=riskAssessment.crossValidateRisk(bd.analysisResult,bd.contractText);
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify(result));
        return;
      }catch(err){
        res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"验证失败: "+err.message}));
        return;
      }
    }
    if(pn==="/api/risk/criteria"&&req.method==="GET"){
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify(riskAssessment.RISK_CRITERIA));
      return;
    }
  }

  async function callLocalPaddleOCR(imageData){
    try{
      var ocrRes=await fetch(PADDLE_OCR_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({image:imageData})
      });
      if(!ocrRes.ok){
        var errText=await ocrRes.text();
        console.error("本地 PaddleOCR error:",ocrRes.status,errText);
        throw new Error("OCR调用失败: "+errText);
      }
      var ocrData=await ocrRes.json();
      console.log("本地 PaddleOCR result:",ocrData);
      var textResult=(ocrData.text||"").trim();
      if(!textResult){
        throw new Error("未识别到任何文字");
      }
      return {
        text:textResult,
        filtered_handwriting:ocrData.filtered_handwriting||false,
        filtered_count:ocrData.filtered_count||0
      };
    }catch(e){
      console.error("Local PaddleOCR error:",e);
      throw e;
    }
  }

  if(pn==="/api/ocr"&&req.method==="POST"){
    try{
      var bd=await pb(req);
      if(!bd.image){
        res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"请提供图片数据"}));
        return;
      }
      if(USE_OCR_MOCK){
        var mockText="甲方：张三\n乙方：李四公司\n\n一、服务内容\n乙方为甲方提供合同审查服务，服务期限为一年。\n\n二、费用与支付\n甲方需一次性支付服务费人民币10000元，于合同签订后3日内支付。\n\n三、违约责任\n若甲方逾期支付费用，每逾期一日需支付总金额5%的违约金。\n甲方不得提前解除合同，否则需支付全额费用作为违约金。\n\n四、其他\n本合同最终解释权归乙方所有。";
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({text: mockText}));
        return;
      }
      var ocrResult=await callLocalPaddleOCR(bd.image);
      var tx=ocrResult.text;
      if(!tx||tx.trim().length<2){
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({text:"",warning:"无法识别图片中的文字"}));
        return;
      }
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({
        text:tx.trim(),
        filtered_handwriting:ocrResult.filtered_handwriting,
        filtered_count:ocrResult.filtered_count
      }));
    }catch(err){
      console.error("OCR error:", err);
      res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({error:"OCR error: "+err.message}));
    }
    return;
  }

  if(pn==="/api/analyze"&&req.method==="POST"){
    try{
      var bd=await pb(req),tx=bd.text;
      if(!tx||tx.trim().length<10){
        res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({error:"合同文本太短"}));
        return;
      }
      if(USE_ANALYZE_MOCK){
        var mockResult={
          overall_risk:"medium",risk_score:55,
          summary:"这份合同部分条款需要注意，但整体风险中等。部分条款虽然常见但建议协商优化。",
          clauses:[
            {type:"需注意",risk_level:"medium",clause:"若甲方逾期支付费用，每逾期一日需支付总金额5%的违约金。",is_false_positive:false,
             explanation:"每日5%的违约金比例需要看具体情况。如果合同金额小、期限短，这个比例可能过高。",
             legal_basis:"《民法典》第585条：约定的违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。",
             counter_script:"您可以这样协商：这个违约金比例我觉得有点高，能不能调整为每日万分之五？",
             recommended_fix:"建议将违约金调整为每日万分之三到万分之五之间"},
            {type:"需注意",risk_level:"low",clause:"甲方不得提前解除合同，否则需支付全额费用作为违约金。",is_false_positive:false,
             explanation:"限制提前解除合同是常见商业约定，但全额违约金可能过高。",
             legal_basis:"《民法典》第562-563条：合同解除的相关规定",
             counter_script:"能不能约定如果我提前30天通知，就可以解除合同？违约金按实际服务时间比例计算？",
             recommended_fix:"建议增加：甲方提前30天通知可解除合同，违约金按已履行时间比例计算"},
            {type:"正常条款",risk_level:"none",clause:"本合同最终解释权归乙方所有。",is_false_positive:true,
             explanation:"这个条款虽然常见，但在司法实践中通常不会被认定为绝对无效。只是在有争议时，会作出不利于提供方的解释。",
             legal_basis:"《民法典》第498条：对格式条款有两种以上解释的，应当作出不利于提供格式条款一方的解释。",
             counter_script:"如果担心可以建议：我们改成'双方对合同条款有争议的，应友好协商解决'？",
             recommended_fix:"可以改为：双方对合同条款有争议的，应友好协商解决"}],
          positive_points:["合同主体清晰","服务内容明确","有明确的期限约定"],
          battle_plan:[
            {step:"1",action:"先协商违约金比例",detail:"主动联系对方，指出违约金可能过高，要求调低至合理水平",script:"您好，我仔细看了合同条款，关于违约金的比例，我觉得可以商量一下。能不能调整为每日万分之五？"},
            {step:"2",action:"讨论合同解除条件",detail:"协商一个更灵活的解约方案",script:"另外，关于提前解除合同的条款，能不能约定如果我提前通知，就不需要支付全额违约金？"}],
          key_takeaway:"这份合同总体尚可，但建议就违约金和合同解除条款进行协商优化。大多数情况下，这类合同通过友好协商可以争取到更合理的条件。"
        };
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify(mockResult));
        return;
      }
      var result=await enhancedContractAnalysis(tx);
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify(result));
      return;
    }catch(err){
      console.error("Analysis error:",err);
      res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({error:"分析失败: "+(err.message||String(err))}));
    }
    return;
  }

  var fp=path.join(PUB,pn==="/"?"index.html":pn);
  ss(res,fp);
});

server.listen(PORT, '0.0.0.0', function(){
  console.log("一纸穿透 已启动");
  console.log("本地访问: http://localhost:"+PORT);
  
  var os = require('os');
  var ifaces = os.networkInterfaces();
  var ips = [];
  Object.keys(ifaces).forEach(function(ifname) {
    ifaces[ifname].forEach(function(iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }
      ips.push(iface.address);
    });
  });
  if(ips.length > 0) {
    console.log("局域网访问:");
    ips.forEach(function(ip) {
      console.log("  http://" + ip + ":" + PORT);
    });
  }
  
  var statusMsgs=[];
  if(USE_OCR_MOCK)statusMsgs.push("OCR使用浏览器端识别（Tesseract.js）");
  else statusMsgs.push("OCR使用本地PaddleOCR服务（"+PADDLE_OCR_URL+"）");
  if(USE_ANALYZE_MOCK)statusMsgs.push("分析使用模拟数据（需配置DEEPSEEK_API_KEY）");
  else statusMsgs.push("分析使用真实API（deepseek-chat）");
  if(ragApi)statusMsgs.push("RAG增强功能已启用");
  else statusMsgs.push("RAG增强功能未加载");
  if(serpApi&&serpApi.hasApiKey)statusMsgs.push("SerpAPI网页搜索已启用");
  else if(serpApi)statusMsgs.push("SerpAPI模块已加载（请配置SERPAPI_KEY）");
  else statusMsgs.push("SerpAPI网页搜索未加载");
  if(reactApi)statusMsgs.push("ReAct决策框架已启用");
  else statusMsgs.push("ReAct决策框架未加载");
  if(statusMsgs.length>0)console.log("提示："+statusMsgs.join("；"));

  initRagInfrastructure().then(function(){
    if(ragEmbeddingService&&ragEmbeddingService.ready){
      console.log("[RAG] 语义检索已就绪 ("+ragEmbeddingService.modelName+")");
    }
  }).catch(function(e){
    console.log("[RAG] 初始化异常:",e.message);
  });
});
