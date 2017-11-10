// @flow

import { normalize, schema } from 'normalizr'

const SCHEMA_DISPLAYNAME = new schema.Entity('displaynames');
const SCHEMA_THUMB = new schema.Entity('thumbs', { displayname:SCHEMA_DISPLAYNAME });
const SCHEMA_COMMENT = new schema.Entity('comments', { displayname:SCHEMA_DISPLAYNAME });
const SCHEMA_EXTENSION = new schema.Entity('extensions', {
    comments: [ SCHEMA_COMMENT ],
    thumbs: [ SCHEMA_THUMB ]
});

export function normalizeUniversal(reply) {
    const normalized = normalize(Array.isArray(reply) ? reply : [ reply ], [ SCHEMA_EXTENSION ]);
    console.log('normalized:', normalized);

    const { thumbs={}, comments={}, displaynames={}, extensions={} } = normalized.entities;
    const entitys = { thumbs, comments, displaynames, extensions };
    return entitys;
}
