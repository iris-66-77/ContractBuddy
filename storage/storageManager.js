
var LocalStorage = require('./localStorage');

class StorageManager {
    constructor(config) {
        this.config = config;
        this.storageType = config.storageType || 'local';
        this.storage = null;
    }

    async initialize() {
        if (this.storage) return;

        switch (this.storageType.toLowerCase()) {
            case 'local':
            default:
                this.storage = new LocalStorage({
                    uploadDir: this.config.uploadDir
                });
                break;
        }

        await this.storage.initialize();
    }

    async upload(fileId, buffer, fileInfo) {
        await this.initialize();
        return this.storage.upload(fileId, buffer, fileInfo);
    }

    async download(fileId, ext) {
        await this.initialize();
        return this.storage.download(fileId, ext);
    }

    async delete(fileId, ext) {
        await this.initialize();
        return this.storage.delete(fileId, ext);
    }

    async exists(fileId, ext) {
        await this.initialize();
        return this.storage.exists(fileId, ext);
    }

    async getUrl(fileId, ext) {
        await this.initialize();
        return this.storage.getUrl(fileId, ext);
    }

    getStorageType() {
        return this.storageType;
    }
}

module.exports = StorageManager;
