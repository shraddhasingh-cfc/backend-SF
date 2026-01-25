import express from 'express';
const router = express.Router();
import pdfRoutes from './route.invpdf.js';

import { searchCustomer, seachItems, searchVendor, searchEmployee, zipCodeDeleveires } from '../controllers/api.controller.js';


// router.get('/', (req, res)=>{
//     res.json('ok');
// })

router.use('/invoice', pdfRoutes)

router.get('/customers/search', searchCustomer)
router.get('/inventory/search', seachItems);
router.get('/inventory/search/:itemid', seachItems);
router.get('/vendors/search', searchVendor);
router.get('/employee/search', searchEmployee);
router.get('/zipcode/search/:zipcode', zipCodeDeleveires);

export default router;