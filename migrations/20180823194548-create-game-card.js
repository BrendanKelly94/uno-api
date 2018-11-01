'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('GameCards', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      player_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        foreignKey: true,
        references: {
          model: 'Players',
          key: 'id'
        },
        onUpdate: 'cascade',
        onDelete: 'cascade'
      },
      game_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        foreignKey: true,
        references: {
          model: 'Games',
          key: 'id'
        },
        onUpdate: 'cascade',
        onDelete: 'cascade'
      },
      color: {
        allowNull: false,
        type: Sequelize.STRING
      },
      value: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      is_in_play: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: Sequelize.literal(false)
      },
      is_available: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: Sequelize.literal(false)
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GameCards');
  }
};
