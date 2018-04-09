'use strict';

const permissionService = require("../api/permission/permission.service");

exports.getDefaultRoles = () => {
    return [
        {
            name: 'Chăm sóc fanpage',
            permissions: [
                "conversation_view",
                "conversation_like",
                "conversation_hide",
                "conversation_rep",
                "conversation_delete",
                "post_view",
                "post_edit",
                "post_autohidecomment",
                "post_delete",
                "conversationtag_view",
                "conversationtag_create",
                "conversationtag_edit",
                "conversationtag_delete",
                "page_view"
            ]
        },
        {
            name: 'Chăm sóc đơn hàng',
            permissions: [
                "allorder_view",
                "allorder_create",
                "allorder_edit",
                "allorder_delete",
                "savedorder_view",
                "savedorder_delete",
                "ordertag_view",
                "ordertag_create",
                "ordertag_edit",
                "ordertag_delete",
            ]
        },
        {
            name: 'Quản lí kho hàng',
            permissions: [
                "product_view",
                "product_inputpriceview",
                "product_create",
                "product_edit",
                "product_delete",
            ]
        },
        {
            name: 'Quản lí nhân sự',
            permissions: [
                "staff_view",
                "staff_create",
                "staff_edit",
                "staff_delete"
            ]
        },
        {
            name: 'Quản lí gian hàng',
            permissions: permissionService.ALL_PERMISSIONS
        }
    ]
};