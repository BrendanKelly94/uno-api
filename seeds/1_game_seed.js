
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('Games').del()
    .then(function () {
      // Inserts seed entries
      return knex('Games').insert([
        {bot_fill: false},
        {bot_fill: false}
      ]);
    });
};
