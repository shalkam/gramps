'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.prepare = prepare;
exports.default = gramps;

var _graphql = require('graphql');

var _graphqlTools = require('graphql-tools');

var _externalDataSources = require('./lib/externalDataSources');

var _mapResolvers = require('./lib/mapResolvers');

var _mapResolvers2 = _interopRequireDefault(_mapResolvers);

var _rootSource = require('./rootSource');

var _rootSource2 = _interopRequireDefault(_rootSource);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Adds supplied options to the Apollo options object.
 * @param  {Object} options  Apollo options for the methods used in GrAMPS
 * @return {Object}          Default options, extended with supplied options
 */
const getDefaultApolloOptions = options => _extends({
  makeExecutableSchema: {},
  addMockFunctionsToSchema: {},
  apolloServer: _extends({}, options.graphqlExpress)
}, options);

const checkTypeDefs = ({ schema, typeDefs, namespace }) => {
  if (typeof schema === 'string') {
    console.warn(namespace, 'Type definitions must be exported as "typeDefs".', 'Use of "schema" has been deprecated and will be removed in a future release');
  }
  return typeDefs || schema;
};

/**
 * Maps data sources and returns array of executable schema
 * @param  {Array}   sources     data sources to combine
 * @param  {Boolean} shouldMock  whether or not to mock resolvers
 * @param  {Object}  options     additional apollo options
 * @return {Array}               list of executable schemas
 */
const mapSourcesToExecutableSchemas = (sources, shouldMock, options) => sources.map(({ schema, typeDefs, resolvers, mocks, namespace }) => {
  const sourceTypeDefs = checkTypeDefs({ schema, typeDefs, namespace });

  if (!sourceTypeDefs) {
    return null;
  }

  const executableSchema = (0, _graphqlTools.makeExecutableSchema)(_extends({}, options.makeExecutableSchema, {
    typeDefs: sourceTypeDefs,
    resolvers: (0, _mapResolvers2.default)(namespace, resolvers)
  }));

  if (shouldMock) {
    (0, _graphqlTools.addMockFunctionsToSchema)(_extends({}, options.addMockFunctionsToSchema, {
      schema: executableSchema,
      mocks
    }));
  }

  return executableSchema;
}).filter(schema => schema instanceof _graphql.GraphQLSchema);

/**
 * Combine schemas, optionally add mocks, and configure `apollo-server-express`.
 *
 * This is the core of GrAMPS, and does a lot. It accepts an array of data
 * sources and combines them into a single schema, resolver set, and context
 * using `graphql-tools` `makeExecutableSchema`. If the `enableMockData` flag is
 * set, mock resolvers are added to the schemausing `graphql-tools`
 * `addMockFunctionsToSchema()`. Finally, `apollo-server-express`
 * `graphqlExpress()` is called.
 *
 * Additional options for any of the Apollo functions can be passed in the
 * `apollo` argument using the function’s name as the key:
 *
 *     {
 *       apollo: {
 *         addMockFunctionsToSchema: {
 *           preserveResolvers: true,
 *         },
 *       },
 *     }
 *
 * @see http://dev.apollodata.com/tools/graphql-tools/mocking.html#addMockFunctionsToSchema
 * @see http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#makeExecutableSchema
 *
 * @param  {Array?}    config.dataSources     data sources to combine
 * @param  {boolean?}  config.enableMockData  whether to add mock resolvers
 * @param  {Function?} config.extraContext    function to add additional context
 * @param  {Object?}   config.logger          requires `info` & `error` methods
 * @param  {Object?}   config.apollo          options for Apollo functions
 * @return {Function}                         req => options for `graphqlExpress()`
 */
function prepare({
  dataSources = [],
  enableMockData = process.env.GRAMPS_MODE === 'mock',
  extraContext = req => ({}), // eslint-disable-line no-unused-vars
  logger = console,
  apollo = {}
} = {}) {
  // Make sure all Apollo options are set properly to avoid undefined errors.
  const apolloOptions = getDefaultApolloOptions(apollo);

  const devSources = (0, _externalDataSources.loadDevDataSources)({ logger });
  const sources = (0, _externalDataSources.overrideLocalSources)({
    sources: dataSources,
    devSources,
    logger
  });

  const allSources = [_rootSource2.default, ...sources];
  const schemas = mapSourcesToExecutableSchemas(allSources, enableMockData, apolloOptions);

  const sourcesWithStitching = sources.filter(source => source.stitching);
  const linkTypeDefs = sourcesWithStitching.map(source => source.stitching.linkTypeDefs);
  const resolvers = sourcesWithStitching.map(source => source.stitching.resolvers);

  const schema = (0, _graphqlTools.mergeSchemas)({
    schemas: [...schemas, ...linkTypeDefs],
    resolvers
  });

  const getContext = (() => {
    var _ref = _asyncToGenerator(function* (req) {
      const extra = yield extraContext(req);
      const allContext = {};
      for (const source of sources) {
        const sourceContext = typeof source.context === 'function' ? yield source.context(req) : source.context;
        allContext[source.namespace] = _extends({}, extra, sourceContext);
      }
      return allContext;
    });

    return function getContext(_x) {
      return _ref.apply(this, arguments);
    };
  })();

  return _extends({
    schema,
    context: getContext,
    addContext: (req, res, next) => {
      req.gramps = getContext(req);
      next();
    }
  }, apolloOptions.apolloServer);
}

function gramps(...args) {
  const options = prepare(...args);

  return _extends({}, options, {
    context: ({ req, connection } = {}) => options.context({ req, connection })
  });
}