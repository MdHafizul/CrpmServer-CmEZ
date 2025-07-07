class ErrorResponse extends Error {
    constructor(message, statusCode, code = 'INTERNAL_ERROR', metadata = {}) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.metadata = metadata;
    }
}

module.exports = ErrorResponse;