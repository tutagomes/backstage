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
  await knex('entities')
    .where({ namespace: null })
    .update({ namespace: 'default' });
  // As MYSQL is case insensitive
  if (knex.client.config.client !== 'mysql2') {
    await knex('entities_search').update({
      key: knex.raw('LOWER(key)'),
      value: knex.raw('LOWER(value)'),
    });
  }
};

exports.down = async function down() {};
