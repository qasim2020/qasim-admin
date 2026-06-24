const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

const { isValidEmail } = require('../modules/checkValidForm');

exports.toggleSideBar = async (req, res) => {
    req.session.sidebarCollapsed = req.body.sidebarCollapsed;

    res.json({
        message: 'Sidebar toggled',
        sidebar: req.body.sidebarCollapsed,
    });
};

exports.getDashboard = async (req, res) => {
    try {
        res.render('home', {
            userId: req.session.userId,
            userName: req.session.name,
            sidebarCollapsed: req.session.sidebarCollapsed ? req.session.sidebarCollapsed : false,
        });
    } catch (error) {
        console.log(error);
        res.status(404).render('error', {
            layout: 'auth',
            heading: 'Server error',
            error,
        });
    }
};