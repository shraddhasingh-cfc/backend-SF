import * as customerService from "../services/customer.service.js";

export async function createCustomer(req, res) {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json(customer);
}
export async function getCustomer(req, res) {
  const customer = await customerService.getCustomerById(req.params.id);
  res.json(customer);
}
