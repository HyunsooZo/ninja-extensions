function parseJson(jsonString) {
    const parsed = JSON.parse(jsonString);
    return analyzeType(parsed);
}

function analyzeType(value) {
    if (value === null) {
        return { type: 'null', value: null };
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return { type: 'array', itemType: { type: 'any' } };
        }

        // 모든 원소의 타입을 분석
        const itemTypes = value.map(item => analyzeType(item));
        const unifiedType = unifyTypes(itemTypes);
        return { type: 'array', itemType: unifiedType };
    }

    if (typeof value === 'object') {
        const properties = {};
        for (const [key, val] of Object.entries(value)) {
            properties[key] = analyzeType(val);
        }
        return { type: 'object', properties };
    }

    if (typeof value === 'string') {
        return { type: 'string', value };
    }

    if (typeof value === 'number') {
        return { type: Number.isInteger(value) ? 'integer' : 'number', value };
    }

    if (typeof value === 'boolean') {
        return { type: 'boolean', value };
    }

    return { type: 'any' };
}

/**
 * 여러 타입을 하나로 통합
 * - 모두 같은 타입이면 그 타입 반환
 * - 다른 타입이 섞여있으면 union 타입 반환
 * - object 타입들은 프로퍼티를 병합
 */
function unifyTypes(types) {
    if (types.length === 0) {
        return { type: 'any' };
    }

    if (types.length === 1) {
        return types[0];
    }

    // 기본 타입들 수집 (중복 제거)
    const typeSet = new Set();
    const objectTypes = [];

    for (const t of types) {
        if (t.type === 'object') {
            objectTypes.push(t);
        } else if (t.type === 'array') {
            typeSet.add('array');
        } else {
            typeSet.add(t.type);
        }
    }

    // integer와 number가 섞여있으면 number로 통합
    if (typeSet.has('integer') && typeSet.has('number')) {
        typeSet.delete('integer');
    }

    // object 타입들이 있으면 프로퍼티 병합 시도
    if (objectTypes.length > 0) {
        const mergedObject = mergeObjectTypes(objectTypes);
        if (typeSet.size === 0) {
            return mergedObject;
        }
        typeSet.add('object');
    }

    // 모든 타입이 동일하면 그 타입 반환
    if (typeSet.size === 1 && objectTypes.length > 0) {
        return mergeObjectTypes(objectTypes);
    }

    if (typeSet.size === 1) {
        const singleType = [...typeSet][0];
        // 배열인 경우 itemType도 통합
        if (singleType === 'array') {
            const arrayTypes = types.filter(t => t.type === 'array');
            const itemTypes = arrayTypes.map(t => t.itemType);
            return { type: 'array', itemType: unifyTypes(itemTypes) };
        }
        return types[0];
    }

    // 여러 타입이 섞여있으면 union 타입 반환
    return {
        type: 'union',
        types: [...typeSet].map(t => {
            if (t === 'object' && objectTypes.length > 0) {
                return mergeObjectTypes(objectTypes);
            }
            return { type: t };
        })
    };
}

/**
 * 여러 object 타입의 프로퍼티를 병합
 * 같은 키가 있으면 타입을 통합
 */
function mergeObjectTypes(objectTypes) {
    if (objectTypes.length === 0) {
        return { type: 'object', properties: {} };
    }

    if (objectTypes.length === 1) {
        return objectTypes[0];
    }

    const mergedProperties = {};
    const allKeys = new Set();

    // 모든 키 수집
    for (const obj of objectTypes) {
        if (obj.properties) {
            Object.keys(obj.properties).forEach(key => allKeys.add(key));
        }
    }

    // 각 키에 대해 타입 통합
    for (const key of allKeys) {
        const typesForKey = objectTypes
            .filter(obj => obj.properties && obj.properties[key])
            .map(obj => obj.properties[key]);

        if (typesForKey.length === 0) {
            mergedProperties[key] = { type: 'any', optional: true };
        } else if (typesForKey.length < objectTypes.length) {
            // 일부 객체에만 있는 키는 optional
            const unified = unifyTypes(typesForKey);
            unified.optional = true;
            mergedProperties[key] = unified;
        } else {
            mergedProperties[key] = unifyTypes(typesForKey);
        }
    }

    return { type: 'object', properties: mergedProperties };
}

module.exports = { parseJson, analyzeType, unifyTypes, mergeObjectTypes };
