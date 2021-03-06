export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const { comments } = root.find(j.Program).get('body', 0).node;

  const mochaToJasmine = [
    { mocha: 'suite', jasmine: 'describe' },
    { mocha: 'test', jasmine: 'it' },
    { mocha: 'setup', jasmine: 'beforeEach' },
    { mocha: 'teardown', jasmine: 'afterEach' },
    { mocha: 'suiteSetup', jasmine: 'beforeAll' },
    { mocha: 'suiteTeardown', jasmine: 'afterAll' }
  ];

  mochaToJasmine.forEach(({ mocha, jasmine }) => {
    root.find(j.CallExpression, {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: mocha }
    }).replaceWith((path) => j.callExpression(j.identifier(jasmine), path.value.arguments));

    root.find(j.CallExpression, {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: mocha },
        property: { type: 'Identifier', name: 'skip' }
      }
    }).replaceWith((path) => j.callExpression(j.memberExpression(
      j.identifier(jasmine),
      j.identifier('skip')
    ), path.value.arguments));
  });

  root.get().node.comments = comments;

  return root.toSource({ arrowParensAlways: true, quote: 'single' });
}
