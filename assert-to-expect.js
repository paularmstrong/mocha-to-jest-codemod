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
      expectedOverride: { type: j.Literal, value: false, raw: 'true' },
      includeNegative: 'isNotTrue'
    },
    {
      assert: 'isFalse',
      expect: 'toBe',
      expectedOverride: { type: j.Literal, value: false, raw: 'false' },
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
      expectedOverride: { type: j.Identifier, name: 'NaN' },
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

  // TODOS:
  // - isFunction
  // - isNotFunction
  // - isObject
  // - isNotObject
  // - isArray
  // - isNotArray
  // - isString
  // - isNotString
  // - isNumber
  // - isNotNumber
  // - isBoolean
  // - isNotBoolean
  // - typeOf
  // - notTypeOf
  // - property
  // - notProperty
  // - deepProperty
  // - notDeepProperty
  // - propertyVal
  // - propertyNotVal
  // - deepPropertyVal
  // - deepPropertyNotVal
  // - lengthOf
  // - operator
  // - closeTo
  // - approximately
  // - sameMembers
  // - sameDeepMembers
  // - includeMembers
  // - includeDeepMembers
  // - oneOf
  // - changes
  // - doesNotChange
  // - increases
  // - doesNotIncrease
  // - decreases
  // - doesNotDecrease
  // - ifError
  // - isExtensible
  // - isNotExtensible
  // - isSealed
  // - isNotSealed
  // - isFrozen
  // - isNotFrozen
  //
  const getArguments = (path, ignoreExpectedValue, expectedOverride) => {
    const [ actual, originalExpectation ] = path.value.arguments;
    const expectation = !ignoreExpectedValue ? (expectedOverride || originalExpectation) : undefined;
    return [ actual, expectation ];
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

  return root.toSource();
}
