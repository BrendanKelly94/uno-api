
exports.up = function(knex, Promise) {
  return knex.schema.createTable('Users', function(table){
      table.string('name').notNullable().primary();
      table.string('pwd').notNullable();
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('Users');
};
