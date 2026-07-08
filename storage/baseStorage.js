
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

class BaseStorage {
    constructor(config) {
        this.config = config;
        this.initialized = false;
    }

    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }

    async upload(fileId, buffer, fileInfo) {
        throw new Error('upload() must be implemented by subclass');
    }

    async download(fileId) {
        throw new Error('download() must be implemented by subclass');
    }

    async delete(fileId) {
        throw new Error('delete() must be implemented by subclass');
    }

    async exists(fileId) {
        throw new Error('exists() must be implemented by subclass');
    }

    async getUrl(fileId) {
        throw new Error('getUrl() must be implemented by subclass');
    }

    generateFileKey(fileId, ext) {
        var subDir = fileId.substring(0, 2);
        return subDir + '/' + fileId + ext;
    }
}

module.exports = BaseStorage;

