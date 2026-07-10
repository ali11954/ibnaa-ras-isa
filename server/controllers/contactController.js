const Contact = require('../models/Contact');
const contactStorage = [];

exports.getAll = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.json(contactStorage.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }
};

exports.create = async (req, res) => {
  try {
    const contact = await Contact.create(req.body);
    res.status(201).json(contact);
  } catch (err) {
    const contact = { ...req.body, _id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'new' };
    contactStorage.push(contact);
    res.status(201).json(contact);
  }
};