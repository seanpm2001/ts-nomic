import { test } from 'uvu';
import * as arrow from 'apache-arrow';
import * as assert from 'uvu/assert';
import { AtlasProject } from '../dist/project.js';
import { make_test_table } from './arrow.test.js';
import { AtlasProjection } from '../dist/projection.js';
import { AtlasUser } from '../dist/user.js';
import { AtlasOrganization } from '../dist/organization.js';

test('Full project flow', async () => {
  // get user
  console.log('getting user');
  const user = new AtlasUser({ useEnvToken: true });

  console.log('THIS TEST IS RUNNING ON: ', user.apiLocation);
  // get organization for user
  console.log('getting organization');
  const user_info = await user.info();
  let organization_id = null;
  if (user_info.default_organization === undefined) {
    organization_id = user_info.organizations[0].organization_id;
  } else {
    organization_id = user_info.default_organization;
  }
  const organization = new AtlasOrganization(organization_id, user);
  // create project in organization
  console.log('creating project');
  const project = await organization.create_project({
    project_name: 'a typescript test text project',
    unique_id_field: 'id',
    modality: 'text',
  });
  // fetch project from user and project id
  console.log('fetching project');
  const project2 = new AtlasProject(project.id, user);
  assert.is(project2.id, project.id);
  // upload arrow table to project
  console.log('uploading arrow');
  const tb = make_test_table({ length: 32, modality: 'text' });
  await project.uploadArrow(tb);
  // create index on project
  console.log('creating index');
  await project.createIndex({
    index_name: 'test index',
    indexed_field: 'text',
    colorable_fields: [],
  });
  // wait for index to be ready
  console.log('waiting for index');
  await project.wait_for_lock();
  // fetch index from project and index id
  console.log('fetching index');
  const index = (await project.indices())[0];
  console.log('fetching projection');
  const orig_projection = (await index.projections())[0];
  // Re-instantiate with just the project; test if we properly infer the index.
  console.log('re-instantiating projection');
  const projection = new AtlasProjection(orig_projection.id, user, { project });
  const inferred_index = await projection.index();
  assert.is(inferred_index.id, index.id);
  // Create a tag
  console.log('Creating tag');
  const tag_id = await projection.createTag({ tag_name: 'test_tag' });
  // Update a tag
  console.log('Updating tag');
  await projection.updateTag({ tag_id, tag_name: 'test_tag2' });
  // Get tags
  console.log('Getting tags');
  const tags = await projection.getTags();
  assert.is(tags[0]['tag_name'], 'test_tag2');
  // Upsert a bitmask
  console.log('Updating tag');
  tile_key = arrow.vectorFromArray(['0/0/0', '0/0/1'], new arrow.Utf8(), {
    nullable: true,
  });
  bitmask = arrow.tableFromArrays({
    tile_key: tile_key,
    bitmask: [
      [true, true],
      [false, false],
    ],
  });
  await projection.upsertTagMask(bitmask, { tag_id });
  // Delete tag
  await projection.deleteTag({ tag_id });
  // delete project
  console.log('deleting project');
  await project.delete();
});

test('test_arrow_text', () => {
  const tb = make_test_table({ length: 32, modality: 'text' });
});

test('test_arrow_embeddings', () => {
  const tb = make_test_table({ length: 32, modality: 'embedding' });
});

test.run();
