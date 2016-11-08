const getAssertionExpression = (identifier) => ({
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    object: {
      type: 'Identifier',
      name: 'assert'
    },
    property: {
      type: 'Identifier',
      name: identifier
    }
  }
});

export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const { comments } = root.find(j.Program).get('body', 0).node;

  const makeExpectation = (identifier, actual, expectation) => {
    return j.callExpression(j.memberExpression(
      j.callExpression(j.identifier('expect'), [ actual ]),
      j.identifier(identifier)
    ), expectation ? [ expectation ] : []);
  };

  const makeNegativeExpectation = (identifier, actual, expectation) => {
    return j.callExpression(j.memberExpression(
      j.memberExpression(
        j.callExpression(j.identifier('expect'), [ actual ]),
        j.identifier('not')
      ),
      j.identifier(identifier)
    ), expectation ? [ expectation ] : []);
  }

  const conversions = [
    {
      assert: 'ok',
      expect: 'toBeTruthy',
      ignoreExpectedValue: true
    },
    {
      assert: 'notOk',
      expect: 'toBeFalsy',
      ignoreExpectedValue: true
    },
    {
      assert: 'isOk',
      expect: 'toBeTruthy',
      ignoreExpectedValue: true
    },
    {
      assert: 'isNotOk',
      expect: 'toBeFalsy',
      ignoreExpectedValue: true
    },
    {
      assert: 'equal',
      expect: 'toEqual',
      includeNegative: 'notEqual'
    },
    {
      assert: 'strictEqual',
      expect: 'toBe',
      includeNegative: 'notStrictEqual'
    },
    {
      assert: 'deepEqual',
      expect: 'toEqual',
      includeNegative: 'notDeepEqual'
    },
    {
      assert: 'isAbove',
      expect: 'toBeGreaterThan'
    },
    {
      assert: 'isAtLeast',
      expect: 'toBeGreaterThanOrEqual'
    },
    {
      assert: 'isBelow',
      expect: 'toBeLessThan'
    },
    {
      assert: 'isAtMost',
      expect: 'toBeLessThanOrEqual'
    },
    {
      assert: 'isTrue',
      expect: 'toBe',
      expectedOverride: j.literal(true),
      includeNegative: 'isNotTrue'
    },
    {
      assert: 'isFalse',
      expect: 'toBe',
      expectedOverride: j.literal(false),
      includeNegative: 'isNotFalse'
    },
    {
      assert: 'isNull',
      expect: 'toBeNull',
      ignoreExpectedValue: true,
      includeNegative: 'isNotNull'
    },
    {
      assert: 'isNaN',
      expect: 'toBe',
      ignoreExpectedValue: true,
      expectedOverride: j.identifier('NaN'),
      includeNegative: 'isNotNaN'
    },
    {
      assert: 'isDefined',
      expect: 'toBeDefined',
      ignoreExpectedValue: true,
      includeNegative: 'isUndefined'
    },
    {
      assert: 'instanceOf',
      expect: 'toBeInstanceOf',
      includeNegative: 'notInstanceOf'
    },
    {
      assert: 'include',
      expect: 'toContain',
      includeNegative: 'notInclude'
    },
    {
      assert: 'match',
      expect: 'toMatch',
      includeNegative: 'notMatch'
    },
    {
      assert: 'throws',
      expect: 'toThrow',
      ignoreExpectedValue: true,
      includeNegative: 'doesNotThrow'
    },
    {
      assert: 'sameMembers',
      expect: 'toEqual'
    },
    {
      assert: 'sameDeepMembers',
      expect: 'toEqual'
    }
  ];

  const getArguments = (path, ignoreExpectedValue, expectedOverride) => {
    const [ actual, originalExpectation ] = path.value.arguments;
    const expectation = !ignoreExpectedValue ? (expectedOverride || originalExpectation) : undefined;
    return expectation ? [ actual, expectation ] : [ actual ];
  }

  conversions.forEach(({ assert, expect, ignoreExpectedValue, includeNegative, expectedOverride }) => {
    root.find(j.CallExpression, getAssertionExpression(assert)).replaceWith((path) => {
      return makeExpectation(expect, ...getArguments(path, ignoreExpectedValue, expectedOverride));
    });

    if (includeNegative) {
      root.find(j.CallExpression, getAssertionExpression(includeNegative)).replaceWith((path) => {
        return makeNegativeExpectation(expect, ...getArguments(path, ignoreExpectedValue, expectedOverride));
      });
    }
  });

  // assert.propertyVal -> expect(*.[prop]).toBe()
  root.find(j.CallExpression, getAssertionExpression('propertyVal')).replaceWith((path) => {
    const [ obj, prop, value ] = path.value.arguments;
    return makeExpectation('toBe', j.memberExpression(obj, prop), value);
  });

  // assert.propertyNotVal -> expect(*.[prop]).not.toBe()
  root.find(j.CallExpression, getAssertionExpression('propertyNotVal')).replaceWith((path) => {
    const [ obj, prop, value ] = path.value.arguments;
    return makeNegativeExpectation('toBe', j.memberExpression(obj, prop), value);
  });

  // assert.property -> expect(*.[prop]).toBeTruthy()
  root.find(j.CallExpression, getAssertionExpression('property')).replaceWith((path) => {
    const [ obj, prop ] = path.value.arguments;
    return makeExpectation('toBeTruthy', j.memberExpression(obj, prop));
  });

  /**
   * Type checking
   */
  const typeofs = [
    { assert: 'isFunction', type: 'function' },
    { assert: 'isObject', type: 'object' },
    { assert: 'isString', type: 'string' },
    { assert: 'isNumber', type: 'number' },
    { assert: 'isBoolean', type: 'boolean' }
  ];

  typeofs.forEach(({ assert, type }) => {
    root.find(j.CallExpression, getAssertionExpression(assert)).replaceWith((path) => {
      return makeExpectation('toBe', j.unaryExpression('typeof', path.value.arguments[0]), j.literal(type));
    });

    root.find(j.CallExpression, getAssertionExpression(assert.replace(/^is/, 'isNot'))).replaceWith((path) => {
      return makeNegativeExpectation('toBe', j.unaryExpression('typeof', path.value.arguments[0]), j.literal(type));
    })
  });

  // isArray/isNotArray, because typeof doesn't work for arrays like you would actually want
  root.find(j.CallExpression, getAssertionExpression('isArray')).replaceWith((path) => {
    return makeExpectation('toBe',
      j.callExpression(j.memberExpression(j.identifier('Array'), j.identifier('isArray')), path.value.arguments[0]),
      j.literal(true)
    );
  });

  root.find(j.CallExpression, getAssertionExpression('isNotArray')).replaceWith((path) => {
    return makeNegativeExpectation('toBe',
      j.callExpression(j.memberExpression(j.identifier('Array'), j.identifier('isArray')), path.value.arguments[0]),
      j.literal(true)
    );
  });

  root.find(j.CallExpression, getAssertionExpression('typeOf')).replaceWith((path) => {
    return makeExpectation('toBe', j.unaryExpression('typeof', path.value.arguments[0]), path.value.arguments[1]);
  });

  root.find(j.CallExpression, getAssertionExpression('notTypeOf')).replaceWith((path) => {
    return makeNegativeExpectation('toBe', j.unaryExpression('typeof', path.value.arguments[0]), path.value.arguments[1]);
  });

  // assert.lengthOf -> expect(*.length).toBe()
  root.find(j.CallExpression, getAssertionExpression('lengthOf')).replaceWith((path) => {
    return makeExpectation('toBe',
      j.memberExpression(path.value.arguments[0], j.identifier('length')),
      path.value.arguments[1]);
  });

  // assert -> expect().toBeTruthy()
  root.find(j.CallExpression, {
    callee: { type: 'Identifier', name: 'assert' }
  }).replaceWith((path) => makeExpectation('toBeTruthy', path.value.arguments[0]));

  // Remove import
  root.find(j.ImportDeclaration, {
    specifiers: [
      {
        type: 'ImportSpecifier',
        imported: { type: 'Identifier', name: 'assert' },
        local: { type: 'Identifier', name: 'assert' }
      }
    ],
    source: { type: 'Literal', value: 'chai' }
  }).remove();

  root.get().node.comments = comments;

  return root.toSource();
}
