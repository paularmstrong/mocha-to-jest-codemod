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

  return root.toSource();
}
