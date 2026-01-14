exports.up = async (knex) => {
  await knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('description');
    table.enum('status', ['pending', 'in_progress', 'completed']).defaultTo('pending');
    table.enum('importance', ['low', 'normal', 'high']).defaultTo('normal');
    table.timestamps(true, true);
    table.index('status');
    table.index('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('tasks');
};
