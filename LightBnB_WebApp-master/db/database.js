const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");

const pool = new Pool({
  user: 'natashachiu',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1;`, [email])
    .then(result => result.rows[0])
    .catch(err => err.message);
  // let resolvedUser = null;
  // for (const userId in users) {
  //   const user = users[userId];
  //   if (user?.email.toLowerCase() === email?.toLowerCase()) {
  //     resolvedUser = user;
  //   }
  // }
  // return Promise.resolve(resolvedUser);
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then(result => result.rows[0])
    .catch(err => err.message);
  // return Promise.resolve(users[id]);
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  return pool
    .query(`
      INSERT INTO users (name, email, password) 
      VALUES ($1, $2, $3);`, [user.name, user.email, user.password])
    .then(result => result.rows[0])
    .catch(err => err.message);
  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
  // return Promise.resolve(user);
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryString =
    `SELECT reservations.*, properties.*, property_reviews.*
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON property_reviews.property_id = properties.id
      WHERE reservations.guest_id = $1
      GROUP BY reservations.id, properties.id
      ORDER BY start_date
      LIMIT 10;`;

  return pool
    .query(queryString, [guest_id])
    .then(result => result.rows[0])
    .catch(err => err.message);
};

/// Properties

const paramsCheck = (queryParams) => {
  if (queryParams.length === 0) {
    return `WHERE `;
  } else {
    return `AND `;
  }
};

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {

  const queryParams = [];

  let queryString = `
   SELECT properties.*, avg(property_reviews.rating) as average_rating
   FROM properties
   JOIN property_reviews ON properties.id = property_id
   `;

  if (options.city) {
    const firstLetter = options.city.charAt(0).toUpperCase();
    const remainingLetters = options.city.slice(1).toLowerCase();
    queryParams.push(`%${firstLetter + remainingLetters}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryString += paramsCheck(queryParams);
    queryParams.push(options.owner_id);
    queryString += `owner_id = $${queryParams.length} `;
  }
  if (options.minimum_price_per_night) {
    queryString += paramsCheck(queryParams);
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `cost_per_night > $${queryParams.length} `;
  }
  if (options.maximum_price_per_night) {
    queryString += paramsCheck(queryParams);
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `cost_per_night < $${queryParams.length} `;
  }
  if (options.minimum_rating) {
    queryString += paramsCheck(queryParams);
    queryParams.push(parseInt(options.minimum_rating));
    queryString += `rating > $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool
    .query(queryString, queryParams)
    .then(result => result.rows)
    .catch(err => err.message);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryParams = [property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, property.cost_per_night, property.street, property.city, property.province, property.post_code, property.country, parseInt(property.parking_spaces), parseInt(property.number_of_bathrooms), parseInt(property.number_of_bedrooms)];
  const queryString =
    `INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;`;

  return pool
    .query(queryString, queryParams)
    .then(result => result.rows[0])
    .catch(err => err.message);
  // const propertyId = Object.keys(properties).length + 1;
  // property.id = propertyId;
  // properties[propertyId] = property;
  // return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
