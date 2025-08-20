const Joi = require('joi');

const registroSchema = Joi.object({
  nombre: Joi.string().min(3).max(100).required(),
  telefono: Joi.string().pattern(/^\d{8,15}$/).required(),
  contraseña: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  telefono: Joi.string().pattern(/^\d{8,15}$/).required(),
  contraseña: Joi.string().required(),
});

module.exports = { registroSchema, loginSchema };
