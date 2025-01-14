/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const Printer = require('@accordproject/concerto-cto').Printer;
const ModelManager = require('../modelmanager');
const Factory = require('../factory');
const Serializer = require('../serializer');

/**
 * The metamodel itself, as a CTO string
 */
const metaModelCto = `namespace concerto.metamodel

concept Position {
  o Integer line
  o Integer column
  o Integer offset
}

concept Range {
  o Position start
  o Position end
  o String source optional
}

concept TypeIdentifier {
  o String name
  o String namespace optional
}

abstract concept DecoratorLiteral {
  o Range location optional
}

concept DecoratorString extends DecoratorLiteral {
  o String value
}

concept DecoratorNumber extends DecoratorLiteral {
  o Double value
}

concept DecoratorBoolean extends DecoratorLiteral {
  o Boolean value
}

concept DecoratorTypeReference extends DecoratorLiteral {
  o TypeIdentifier type
  o Boolean isArray default=false
}

concept Decorator {
  o String name
  o DecoratorLiteral[] arguments optional
  o Range location optional
}

concept Identified {
}

concept IdentifiedBy extends Identified {
  o String name
}

abstract concept Declaration {
  o String name regex=/^(?!null|true|false)(\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nl}|\\$|_|\\\\u[0-9A-Fa-f]{4})(?:\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nl}|\\$|_|\\\\u[0-9A-Fa-f]{4}|\\p{Mn}|\\p{Mc}|\\p{Nd}|\\p{Pc}|\\u200C|\\u200D)*$/u
  o Decorator[] decorators optional
  o Range location optional
}

concept EnumDeclaration extends Declaration {
  o EnumProperty[] properties
}

concept EnumProperty {
  o String name regex=/^(?!null|true|false)(\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nl}|\\$|_|\\\\u[0-9A-Fa-f]{4})(?:\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nl}|\\$|_|\\\\u[0-9A-Fa-f]{4}|\\p{Mn}|\\p{Mc}|\\p{Nd}|\\p{Pc}|\\u200C|\\u200D)*$/u
  o Decorator[] decorators optional
  o Range location optional
}

concept ConceptDeclaration extends Declaration {
  o Boolean isAbstract default=false
  o Identified identified optional
  o TypeIdentifier superType optional
  o Property[] properties
}

concept AssetDeclaration extends ConceptDeclaration {
}

concept ParticipantDeclaration extends ConceptDeclaration {
}

concept TransactionDeclaration extends ConceptDeclaration {
}

concept EventDeclaration extends ConceptDeclaration {
}

abstract concept Property {
  o String name regex=/^(?!null|true|false)(\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nl}|\\$|_|\\\\u[0-9A-Fa-f]{4})(?:\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nl}|\\$|_|\\\\u[0-9A-Fa-f]{4}|\\p{Mn}|\\p{Mc}|\\p{Nd}|\\p{Pc}|\\u200C|\\u200D)*$/u
  o Boolean isArray default=false
  o Boolean isOptional default=false
  o Decorator[] decorators optional
  o Range location optional
}

concept RelationshipProperty extends Property {
  o TypeIdentifier type
}

concept ObjectProperty extends Property {
  o String defaultValue optional
  o TypeIdentifier type
}

concept BooleanProperty extends Property {
  o Boolean defaultValue optional
}

concept DateTimeProperty extends Property {
}

concept StringProperty extends Property {
  o String defaultValue optional
  o StringRegexValidator validator optional
}

concept StringRegexValidator {
  o String pattern
  o String flags
}

concept DoubleProperty extends Property {
  o Double defaultValue optional
  o DoubleDomainValidator validator optional
}

concept DoubleDomainValidator {
  o Double lower optional
  o Double upper optional
}

concept IntegerProperty extends Property {
  o Integer defaultValue optional
  o IntegerDomainValidator validator optional
}

concept IntegerDomainValidator {
  o Integer lower optional
  o Integer upper optional
}

concept LongProperty extends Property {
  o Long defaultValue optional
  o LongDomainValidator validator optional
}

concept LongDomainValidator {
  o Long lower optional
  o Long upper optional
}

abstract concept Import {
  o String namespace
  o String uri optional
}

concept ImportAll extends Import {
}

concept ImportType extends Import {
  o String name
}

concept Model {
  o String namespace
  o String sourceUri optional
  o String concertoVersion optional
  o Import[] imports optional
  o Declaration[] declarations optional
}

concept Models {
  o Model[] models
}
`;

/**
 * Class to work with the Concerto metamodel
 */
class MetaModel {

    /**
     * Returns the metamodel CTO
     * @returns {string} the metamodel as a CTO string
     */
    static getMetaModelCto() {
        return metaModelCto;
    }

    /**
     * Create a metamodel manager (for validation against the metamodel)
     * @return {*} the metamodel manager
     */
    static createMetaModelManager() {
        const metaModelManager = new ModelManager();
        metaModelManager.addModelFile(metaModelCto, 'concerto.metamodel');
        return metaModelManager;
    }

    /**
     * Validate against the metamodel
     * @param {object} input - the metamodel in JSON
     * @return {object} the validated metamodel in JSON
     */
    static validateMetaModel(input) {
        const metaModelManager = MetaModel.createMetaModelManager();
        const factory = new Factory(metaModelManager);
        const serializer = new Serializer(factory, metaModelManager);
        // First validate the metaModel
        const object = serializer.fromJSON(input);
        return serializer.toJSON(object);
    }

    /**
     * Create a name resolution table
     * @param {*} modelManager - the model manager
     * @param {object} metaModel - the metamodel (JSON)
     * @return {object} mapping from a name to its namespace
     */
    static createNameTable(modelManager, metaModel) {
        const table = {
            'Concept': 'concerto',
            'Asset': 'concerto',
            'Participant': 'concerto',
            'Transaction ': 'concerto',
            'Event': 'concerto',
        };

        // First list the imported names in order (overriding as we go along)
        const imports = metaModel.imports;
        imports.forEach((imp) => {
            const namespace = imp.namespace;
            const modelFile = modelManager.getModelFile(namespace);
            if (imp.$class === 'concerto.metamodel.ImportType') {
                if (!modelFile.getLocalType(imp.name)) {
                    throw new Error(`Declaration ${imp.name} in namespace ${namespace} not found`);
                }
                table[imp.name] = namespace;
            } else {
                const decls = modelFile.getAllDeclarations();
                decls.forEach((decl) => {
                    table[decl.getName()] = namespace;
                });
            }
        });

        // Then add the names local to this metaModel (overriding as we go along)
        if (metaModel.declarations) {
            metaModel.declarations.forEach((decl) => {
                table[decl.name] = metaModel.namespace;
            });
        }

        return table;
    }

    /**
     * Resolve a name using the name table
     * @param {string} name - the name of the type to resolve
     * @param {object} table - the name table
     * @return {string} the namespace for that name
     */
    static resolveName(name, table) {
        if (!table[name]) {
            throw new Error(`Name ${name} not found`);
        }
        return table[name];
    }

    /**
     * Name resolution for metamodel
     * @param {object} metaModel - the metamodel (JSON)
     * @param {object} table - the name table
     * @return {object} the metamodel with fully qualified names
     */
    static resolveTypeNames(metaModel, table) {
        switch (metaModel.$class) {
        case 'concerto.metamodel.Model': {
            if (metaModel.declarations) {
                metaModel.declarations.forEach((decl) => {
                    MetaModel.resolveTypeNames(decl, table);
                });
            }
        }
            break;
        case 'concerto.metamodel.AssetDeclaration':
        case 'concerto.metamodel.ConceptDeclaration':
        case 'concerto.metamodel.EventDeclaration':
        case 'concerto.metamodel.TransactionDeclaration':
        case 'concerto.metamodel.ParticipantDeclaration': {
            if (metaModel.superType) {
                const name = metaModel.superType.name;
                metaModel.superType.namespace = MetaModel.resolveName(name, table);
            }
            metaModel.properties.forEach((property) => {
                MetaModel.resolveTypeNames(property, table);
            });
            if (metaModel.decorators) {
                metaModel.decorators.forEach((decorator) => {
                    MetaModel.resolveTypeNames(decorator, table);
                });
            }
        }
            break;
        case 'concerto.metamodel.EnumDeclaration': {
            if (metaModel.decorators) {
                metaModel.decorators.forEach((decorator) => {
                    MetaModel.resolveTypeNames(decorator, table);
                });
            }
        }
            break;
        case 'concerto.metamodel.EnumProperty':
        case 'concerto.metamodel.ObjectProperty':
        case 'concerto.metamodel.RelationshipProperty': {
            const name = metaModel.type.name;
            metaModel.type.namespace = MetaModel.resolveName(name, table);
            if (metaModel.decorators) {
                metaModel.decorators.forEach((decorator) => {
                    MetaModel.resolveTypeNames(decorator, table);
                });
            }
        }
            break;
        case 'concerto.metamodel.Decorator': {
            if (metaModel.arguments) {
                metaModel.arguments.forEach((argument) => {
                    MetaModel.resolveTypeNames(argument, table);
                });
            }
        }
            break;
        case 'concerto.metamodel.DecoratorTypeReference': {
            const name = metaModel.type.name;
            metaModel.type.namespace = MetaModel.resolveName(name, table);
        }
            break;
        }
        return metaModel;
    }

    /**
     * Resolve the namespace for names in the metamodel
     * @param {object} modelManager - the ModelManager
     * @param {object} metaModel - the MetaModel
     * @param {boolean} [validate] - whether to perform validation
     * @return {object} the resolved metamodel
     */
    static resolveMetaModel(modelManager, metaModel, validate = true) {
        // First, validate the JSON metaModel
        const mm = validate ? MetaModel.validateMetaModel(metaModel) : metaModel;

        const result = JSON.parse(JSON.stringify(mm));
        const nameTable = MetaModel.createNameTable(modelManager, mm);
        // This adds the fully qualified names to the same object
        MetaModel.resolveTypeNames(result, nameTable);
        return result;
    }

    /**
     * Export metamodel from a model file
     * @param {object} modelFile - the ModelFile
     * @param {boolean} [validate] - whether to perform validation
     * @return {object} the metamodel for this model
     */
    static modelFileToMetaModel(modelFile, validate = true) {
        // Last, validate the JSON metaModel
        return validate ? MetaModel.validateMetaModel(modelFile.ast) : modelFile.ast;
    }

    /**
     * Export metamodel from a model manager
     * @param {object} modelManager - the ModelManager
     * @param {boolean} [resolve] - whether to resolve names
     * @param {boolean} [validate] - whether to perform validation
     * @return {object} the metamodel for this model manager
     */
    static modelManagerToMetaModel(modelManager, resolve, validate = true) {
        const result = {
            $class: 'concerto.metamodel.Models',
            models: [],
        };
        modelManager.getModelFiles().forEach((modelFile) => {
            let metaModel = modelFile.ast;
            if (resolve) {
                // No need to re-validate when models are obtained from model manager
                metaModel = MetaModel.resolveMetaModel(modelManager, metaModel, false);
            }
            result.models.push(metaModel);
        });
        return result;
    }

    /**
     * Import metamodel to a model manager
     * @param {object} metaModel - the metamodel
     * @param {boolean} [validate] - whether to perform validation
     * @return {object} the metamodel for this model manager
     */
    static modelManagerFromMetaModel(metaModel, validate = true) {
        // First, validate the JSON metaModel
        const mm = validate ? MetaModel.validateMetaModel(metaModel) : metaModel;

        const modelManager = new ModelManager();

        mm.models.forEach((mm) => {
            const cto = Printer.toCTO(mm); // No need to re-validate
            modelManager.addModelFile(cto, null, false);
        });

        modelManager.validateModelFiles();
        return modelManager;
    }
}

module.exports = MetaModel;