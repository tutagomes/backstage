/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  // Sqlite does not support alter column.
  if (knex.client.config.client !== 'sqlite3') {
    await knex.schema.alterTable('entities_search', table => {
      // MYSQL does not support using 'text' as Key or Unique
      if (knex.client.config.client === 'mysql2') {
        table.string('value').nullable().alter();
      } else {
        table.text('value').nullable().alter();
      }
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  // Sqlite does not support alter column.
  if (knex.client.config.client !== 'sqlite3') {
    await knex.schema.alterTable('entities_search', table => {
      table.string('value').nullable().alter();
    });
  }
};
