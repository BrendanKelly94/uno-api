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
        type: Sequelize.STRING,
        allowNull: false
      },
      direction:{
        type: Sequelize.BOOLEAN,
        allowNull: false
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
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Games');
  }
};
