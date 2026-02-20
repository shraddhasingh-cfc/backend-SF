import express from 'express';
const router = express.Router();
import pdfRoutes from './route.invpdf.js';
import quotesheetRoutes from "./route.commit.js";
import { searchCustomer, seachItems, searchVendor, searchEmployee, zipCodeDeliveries, searchCustomerAdv } from '../controllers/api.controller.js';


// router.get('/', (req, res)=>{
//     res.json('ok');
// })

router.use('/invoice', pdfRoutes)
router.use("/quotesheet", quotesheetRoutes);
router.use("/invoice", commitRoutes);
router.get('/customers/search', searchCustomer)
router.get('/customers/search/adv', searchCustomerAdv)
router.get('/inventory/search', seachItems);
router.get('/inventory/search/:itemid', seachItems);
router.get('/vendors/search', searchVendor);
router.get('/employee/search', searchEmployee);
router.get('/zipcode/search/:zipcode', zipCodeDeliveries);

export default router;


/* 
    const debounce = (fn, delay = 350) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    };

    // ---------- API ----------
    async function searchCustomers(q, zip='') {
        const res = await axios.get('/api/customers/search', {
            params: { q, zip }
        });
        return res.data;
    }

*/
