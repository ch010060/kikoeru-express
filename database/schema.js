const { knex } = require('./db');

const dbVersion = '20210502081522';

// 数据库结构
const createSchema = () => knex.schema
  .createTable('t_circle', (table) => {
    table.increments(); // id自增列(INTEGER 类型)，会被用作主键 [社团id]
    table.string('name').notNullable(); // VARCHAR 类型 [社团名称]
  })
  .createTable('t_work', (table) => {
    table.increments(); // id自增列(INTEGER 类型)，会被用作主键 [音声id]
    table.string('root_folder').notNullable(); // VARCHAR 类型 [根文件夹别名]
    table.string('dir').notNullable(); // VARCHAR 类型 [相对存储路径]
    table.string('title').notNullable(); // VARCHAR 类型 [音声名称]
    table.integer('circle_id').notNullable(); // INTEGER 类型 [社团id]
    table.boolean('nsfw'); // BOOLEAN 类型
    table.string('release');  // VARCHAR 类型 [贩卖日 (YYYY-MM-DD)]

    table.integer('dl_count'); // INTEGER 类型 [售出数]
    table.integer('price'); // INTEGER 类型 [价格]
    table.integer('review_count'); // INTEGER 类型 [评论数量]
    table.integer('rate_count'); // INTEGER 类型 [评价数量]
    table.float('rate_average_2dp'); // FLOAT 类型 [平均评价]
    table.text('rate_count_detail'); // TEXT 类型 [评价分布明细]
    table.text('rank'); // TEXT 类型 [历史销售业绩]
    
    table.foreign('circle_id').references('id').inTable('t_circle'); // FOREIGN KEY 外键
    table.index(['circle_id', 'release', 'dl_count', 'review_count', 'price', 'rate_average_2dp'], 't_work_index'); // INDEX 索引
  })
  .createTable('t_tag', (table) => {
    table.increments(); // id自增列(INTEGER 类型)，会被用作主键 [标签id]
    table.string('name').notNullable(); // VARCHAR 类型 [标签名称]
  })
  .createTable('t_va', (table) => {
    table.string('id'); // UUID v5, 基于name生成的固定值
    table.string('name').notNullable(); // VARCHAR 类型 [声优名称]
    table.primary('id');
  })
  .createTable('r_tag_work', (table) => {
    table.integer('tag_id');
    table.integer('work_id');
    table.foreign('tag_id').references('id').inTable('t_tag'); // FOREIGN KEY 外键
    table.foreign('work_id').references('id').inTable('t_work'); // FOREIGN KEY 外键
    table.primary(['tag_id', 'work_id']); // PRIMARY KEYprimary 主键
  })
  .createTable('r_va_work', (table) => {
    table.string('va_id');
    table.integer('work_id');
    table.foreign('va_id').references('id').inTable('t_va').onUpdate('CASCADE').onDelete('CASCADE'); // FOREIGN KEY 外键
    table.foreign('work_id').references('id').inTable('t_work').onUpdate('CASCADE').onDelete('CASCADE'); // FOREIGN KEY 外键
    table.primary(['va_id', 'work_id']); // PRIMARY KEYprimary 主键
  })
  .createTable('t_user', (table) => {
    table.string('name').notNullable();
    table.string('password').notNullable();
    table.string('group').notNullable(); // USER ADMIN guest
    table.primary(['name']); // PRIMARY KEYprimary 主键
  })
  .createTable('t_review', (table) => {
    table.string('user_name').notNullable();
    table.string('work_id').notNullable();
    table.integer('rating'); // 用户评分1-5
    table.string('review_text'); // 用户评价文字
    table.timestamps(true, true); // 时间戳created_at, updated_at
    table.string('progress'); // ['marked', 'listening', 'listened', 'replay'，'postponed', null]
    table.foreign('user_name').references('name').inTable('t_user').onDelete('CASCADE'); // FOREIGN KEY 
    table.foreign('work_id').references('id').inTable('t_work').onDelete('CASCADE'); // FOREIGN KEY 
    table.primary(['user_name', 'work_id']); // PRIMARY KEY
  })
  .raw(`
    CREATE VIEW IF NOT EXISTS staticMetadata AS
    SELECT baseQueryWithVA.*,
      json_object('tags', json_group_array(json_object('id', t_tag.id, 'name', t_tag.name))) AS tagObj
    FROM (
      SELECT baseQuery.*,
        json_object('vas', json_group_array(json_object('id', t_va.id, 'name', t_va.name))) AS vaObj
      FROM (
        SELECT t_work.id, 
          t_work.title,
          t_work.circle_id,
          t_circle.name,
          t_series.name,
          json_object('id', t_work.circle_id, 'name', t_circle.name) AS circleObj,
          json_object('id', t_work.series_id, 'name', t_series.name) AS seriesObj,
          t_work.nsfw,
          t_work.release,
          t_work.dl_count,
          t_work.price,
          t_work.review_count,
          t_work.rate_count,
          t_work.rate_average_2dp,
          t_work.rate_count_detail,
          t_work.rank,
          t_work.insert_time,
          t_work.series_id
        FROM t_work
        JOIN t_circle ON t_circle.id = t_work.circle_id
        LEFT JOIN t_series ON t_series.id = t_work.series_id
      ) AS baseQuery
      JOIN r_va_work ON r_va_work.work_id = baseQuery.id
      JOIN t_va ON t_va.id = r_va_work.va_id
      GROUP BY baseQuery.id
    ) AS baseQueryWithVA
    LEFT JOIN r_tag_work ON r_tag_work.work_id = baseQueryWithVA.id
    LEFT JOIN t_tag ON t_tag.id = r_tag_work.tag_id
    GROUP BY baseQueryWithVA.id;
  `)
  .then(() => {
    console.log(' * 成功构建数据库结构.');
  })
  .catch((err) => {
    if (err.toString().indexOf('table `t_circle` already exists') !== -1) {
      console.log(' * 数据库结构已经存在.');
    } else {
      throw err;
    }
  });

const createTableHistory = () => knex.schema
.createTable('t_history', (table) => {
  table.integer('id').primary();         
  table.string('user_name').notNullable();  // 用户名
  table.string('work_id').notNullable();    // 作品id
  table.string('file_index').notNullable(); // 音频index
  table.string('file_name');                // 播放音频文件名
  table.integer('play_time');               // 播放进度(s)
  table.integer('total_time');              // 总时间(s)
  table.timestamps(true, true);             // 时间戳created_at, updated_at
  table.foreign('user_name').references('name').inTable('t_user').onDelete('CASCADE'); // FOREIGN KEY 
  table.foreign('work_id').references('id').inTable('t_work').onDelete('CASCADE'); // FOREIGN KEY 
  table.unique(['user_name', 'work_id', 'file_index']);  // PRIMARY KEY
})
.then(() => {
  console.log(' * 成功构建数据库结构.');
})
.catch((err) => {
  if (err.toString().indexOf('table `t_history` already exists') !== -1) {
    console.log(' * 数据库结构已经存在.');
  } else {
    console.log(err);
  }
});

const createTableHistoryIfNotExists = () => knex.schema.hasTable('t_history').then(function(exists) {
  if (!exists) {
    createTableHistory();
  }
});

const addInsertTimeToTableWork =  () => knex.schema
.raw("ALTER TABLE t_work ADD COLUMN insert_time timestamp DEFAULT null")
.raw("DROP VIEW staticMetadata")
.raw(`
      CREATE VIEW IF NOT EXISTS staticMetadata AS
      SELECT baseQueryWithVA.*,
        json_object('tags', json_group_array(json_object('id', t_tag.id, 'name', t_tag.name))) AS tagObj
      FROM (
        SELECT baseQuery.*,
          json_object('vas', json_group_array(json_object('id', t_va.id, 'name', t_va.name))) AS vaObj
        FROM (
          SELECT t_work.id, 
            t_work.title,
            t_work.circle_id,
            t_circle.name,
            t_series.name,
            json_object('id', t_work.circle_id, 'name', t_circle.name) AS circleObj,
            json_object('id', t_work.series_id, 'name', t_series.name) AS seriesObj,
            t_work.nsfw,
            t_work.release,
            t_work.dl_count,
            t_work.price,
            t_work.review_count,
            t_work.rate_count,
            t_work.rate_average_2dp,
            t_work.rate_count_detail,
            t_work.rank,
            t_work.insert_time,
            t_work.series_id
        FROM t_work
        JOIN t_circle ON t_circle.id = t_work.circle_id
        LEFT JOIN t_series ON t_series.id = t_work.series_id
        ) AS baseQuery
        JOIN r_va_work ON r_va_work.work_id = baseQuery.id
        JOIN t_va ON t_va.id = r_va_work.va_id
        GROUP BY baseQuery.id
      ) AS baseQueryWithVA
      LEFT JOIN r_tag_work ON r_tag_work.work_id = baseQueryWithVA.id
      LEFT JOIN t_tag ON t_tag.id = r_tag_work.tag_id
      GROUP BY baseQueryWithVA.id;
`)
.then(() => {
  console.log(' * 成功修改数据库schema.');
})
.catch((err) => {
    console.log(err);
});

const addInsertTimeToTableWorkIfNotExists = () => knex.schema.hasColumn("t_work", "insert_time").then(function(exists) {
  if (!exists) {
    addInsertTimeToTableWork();
  }
})

const addSeriesIdToTableWork =  () => knex.schema
    .raw("ALTER TABLE t_work ADD COLUMN series_id int DEFAULT null")
    .raw("DROP VIEW staticMetadata")
    .raw(`
      CREATE VIEW IF NOT EXISTS staticMetadata AS
      SELECT baseQueryWithVA.*,
        json_object('tags', json_group_array(json_object('id', t_tag.id, 'name', t_tag.name))) AS tagObj
      FROM (
        SELECT baseQuery.*,
          json_object('vas', json_group_array(json_object('id', t_va.id, 'name', t_va.name))) AS vaObj
        FROM (
          SELECT t_work.id, 
            t_work.title,
            t_work.circle_id,
            t_circle.name,
            t_series.name,
            json_object('id', t_work.circle_id, 'name', t_circle.name) AS circleObj,
            json_object('id', t_work.series_id, 'name', t_series.name) AS seriesObj,
            t_work.nsfw,
            t_work.release,
            t_work.dl_count,
            t_work.price,
            t_work.review_count,
            t_work.rate_count,
            t_work.rate_average_2dp,
            t_work.rate_count_detail,
            t_work.rank,
            t_work.insert_time,
            t_work.series_id
        FROM t_work
        JOIN t_circle ON t_circle.id = t_work.circle_id
        LEFT JOIN t_series ON t_series.id = t_work.series_id
        ) AS baseQuery
        JOIN r_va_work ON r_va_work.work_id = baseQuery.id
        JOIN t_va ON t_va.id = r_va_work.va_id
        GROUP BY baseQuery.id
      ) AS baseQueryWithVA
      LEFT JOIN r_tag_work ON r_tag_work.work_id = baseQueryWithVA.id
      LEFT JOIN t_tag ON t_tag.id = r_tag_work.tag_id
      GROUP BY baseQueryWithVA.id;
`)
    .then(() => {
      console.log(' * 成功修改数据库schema.');
    })
    .catch((err) => {
      console.log(err);
    });

const addSeriesIdToTableWorkIfNotExists = () => knex.schema.hasColumn("t_work", "series_id").then(function(exists) {
  if (!exists) {
    addSeriesIdToTableWork();
  }
})

const createTableSeries = () => knex.schema
    .createTable('t_series', (table) => {
      table.integer('id').primary();
      table.string('name');             // 系列名称
    })
    .raw("DROP VIEW staticMetadata")
    .raw(`
      CREATE VIEW IF NOT EXISTS staticMetadata AS
      SELECT baseQueryWithVA.*,
        json_object('tags', json_group_array(json_object('id', t_tag.id, 'name', t_tag.name))) AS tagObj
      FROM (
        SELECT baseQuery.*,
          json_object('vas', json_group_array(json_object('id', t_va.id, 'name', t_va.name))) AS vaObj
        FROM (
          SELECT t_work.id, 
            t_work.title,
            t_work.circle_id,
            t_circle.name,
            t_series.name,
            json_object('id', t_work.circle_id, 'name', t_circle.name) AS circleObj,
            json_object('id', t_work.series_id, 'name', t_series.name) AS seriesObj,
            t_work.nsfw,
            t_work.release,
            t_work.dl_count,
            t_work.price,
            t_work.review_count,
            t_work.rate_count,
            t_work.rate_average_2dp,
            t_work.rate_count_detail,
            t_work.rank,
            t_work.insert_time,
            t_work.series_id
        FROM t_work
        JOIN t_circle ON t_circle.id = t_work.circle_id
        LEFT JOIN t_series ON t_series.id = t_work.series_id
        ) AS baseQuery
        JOIN r_va_work ON r_va_work.work_id = baseQuery.id
        JOIN t_va ON t_va.id = r_va_work.va_id
        GROUP BY baseQuery.id
      ) AS baseQueryWithVA
      LEFT JOIN r_tag_work ON r_tag_work.work_id = baseQueryWithVA.id
      LEFT JOIN t_tag ON t_tag.id = r_tag_work.tag_id
      GROUP BY baseQueryWithVA.id;
`)
    .then(() => {
      console.log(' * 成功构建数据库结构.');
    })
    .catch((err) => {
      if (err.toString().indexOf('table `t_series` already exists') !== -1) {
        console.log(' * 数据库结构已经存在.');
      } else {
        console.log(err);
      }
    });

const createTableSeriesIfNotExists = () => knex.schema.hasTable('t_series').then(function(exists) {
  if (!exists) {
    createTableSeries();
  }
});

module.exports = { createSchema, createTableHistoryIfNotExists, addInsertTimeToTableWorkIfNotExists, addSeriesIdToTableWorkIfNotExists, createTableSeriesIfNotExists, dbVersion };
