exports.unauthorized = () => {
    return {
        success: false,
        code: 401,
        reason: 'Unauthorized'
    }
};

exports.fail = (reason) => {
    return {
        success: false,
        code: 402,
        reason: reason || "Error"
    }
};

exports.success = (data) => {
    return {
        success: true,
        code: 202,
        data
    }
};