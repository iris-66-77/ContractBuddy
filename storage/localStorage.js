
var fs = require('fs');
var path = require('path');
var BaseStorage = require('./baseStorage');

class LocalStorage extends BaseStorage {
    constructor(config) {
        super(config);
        this.uploadDir = config.uploadDir || path.join(__dirname, '..', 'data', 'uploads');
    }

    async initialize() {
        if (this.initialized) return;
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
        this.initialized = true;
    }

    generateFilePath(fileId, ext) {
        var subDir = fileId.substring(0, 2);
        var dirPath = path.join(this.uploadDir, subDir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return path.join(dirPath, fileId + ext);
    }

    async upload(fileId, buffer, fileInfo) {
        await this.initialize();
        var ext = fileInfo.extension || '.bin';
        var filePath = this.generateFilePath(fileId, ext);
        fs.writeFileSync(filePath, buffer);
        return {
            success: true,
            path: path.relative(path.join(__dirname, '..'), filePath)
        };
    }

    async download(fileId, ext) {
        await this.initialize();
        var filePath = this.generateFilePath(fileId, ext);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return fs.readFileSync(filePath);
    }

    async delete(fileId, ext) {
        await this.initialize();
        var filePath = this.generateFilePath(fileId, ext);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return { success: true };
    }

    async exists(fileId, ext) {
        await this.initialize();
        var filePath = this.generateFilePath(fileId, ext);
        return fs.existsSync(filePath);
    }

    async getUrl(fileId, ext) {
        return `/api/files/${fileId}`;
    }
}

module.exports = LocalStorage;
