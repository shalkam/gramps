'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _GraphQLUpload = require('graphql-upload/lib/GraphQLUpload');

var _package = require('../package.json');

var _package2 = _interopRequireDefault(_package);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const typeDefs = `
  scalar Upload

  type Query {
    # Returns the current version of GrAMPS.
    grampsVersion: String!
  }

  schema {
    query: Query
  }
`;

const resolvers = {
  Upload: _GraphQLUpload.GraphQLUpload,

  Query: {
    grampsVersion: /* istanbul ignore next */() => _package2.default.version
  }
};

exports.default = { typeDefs, resolvers };