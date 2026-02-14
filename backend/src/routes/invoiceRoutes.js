const express = require("express");
const router = express.Router();

const invoiceController = require("../controllers/invoiceController");


router.get( "/list", invoiceController.getInvoices);


module.exports = router;