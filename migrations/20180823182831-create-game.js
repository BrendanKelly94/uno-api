'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Games', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      has_started: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: Sequelize.literal(false)
      },
      direction:{
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: Sequelize.literal(false)
      },
      turn_id:{
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: Sequelize.literal(0)
      },
      player_count:{
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: Sequelize.literal(1)
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Games');
  }
};
