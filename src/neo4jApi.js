require('file?name=[name].[ext]!../node_modules/neo4j-driver/lib/browser/neo4j-web.min.js');
var Movie = require('./models/Movie');
var Actor = require('./models/Actor');
var MovieCast = require('./models/MovieCast');
var _ = require('lodash');


// //local development
// var neo4j = window.neo4j.v1;
// var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "R3lofl3x"));


//heroku
var graphenedbURL = "bolt://hobby-dbpacodifichgbkecgjknebl.dbs.graphenedb.com:24786";
var graphenedbUser = "app115045636-zsN3Rp";
var graphenedbPass = "b.N4b260XCLkxA.9abEcB7ZPd3S4ixQ";

var driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));


function searchMovies(queryString) {
  var session = driver.session();
  return session
    .run(
      'MATCH (movie:Movie) \
      WHERE movie.title =~ {title} \
      RETURN movie',
      {title: '(?i).*' + queryString + '.*'}
    )
    .then(result => {
      session.close();
      return result.records.map(record => {
        return new Movie(record.get('movie'));
      });
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

function getMovie(title) {
  var session = driver.session();
  return session
    .run(
      "MATCH (movie:Movie {title:{title}}) \
      OPTIONAL MATCH (movie)<-[r]-(person:Person) \
      RETURN movie.title AS title, \
      collect([person.name, \
           head(split(lower(type(r)), '_')), r.roles]) AS cast \
      LIMIT 1", {title})
    .then(result => {
      session.close();

      if (_.isEmpty(result.records))
        return null;
      var record = result.records[0];
      return new MovieCast(record.get('title'), record.get('cast'));
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

function getOtherActors(title) {
  var session = driver.session();
  return session
  .run(
    "MATCH (p: Person) RETURN p"
  )
  .then(result => {
    session.close();
    return result.records.map(record => {
      //console.log(record);
      return new Actor(record.get('p'));
    });
  })
  .catch(error => {
    session.close();
    throw error;
  });
}

function updateMovie(movie) {
  console.log("movie obj to be updated: ", movie);
  searchMovies(movie.title);
  var session = driver.session();
  return session
    .run(
      'MATCH (m:Movie { title: {title} }) \
      SET m = {movie}',{movie: movie, title: movie.title}
    )
    .then(result => {
      session.close();
      return 0;
    })
    .catch(error => {
      session.close();
      throw error;
    })
}

function createMovie(movie) {
  console.log("movie to create: ", movie);
  var session1 = driver.session();
  return session1
    .run(
      'MATCH (m:Movie { title: {title} }) return count(m) as count', {title: movie.title}
    )
    .then(result => {
      session1.close();
      //console.log('count def: ', result.records[0].get('count'));
      if (result.records[0].get('count').low != 0 || result.records[0].get('count').high != 0) {
        return 'Movie with this title already exists!';
      } else {
          //return createMovieForReal(movie);
          var session = driver.session();
          return session
          .run(
            'CREATE (m: Movie {title: {title}, \
              released: {released}, tagline: {tagline}})',
              {title:movie.title, tagline: movie.tagline, released: movie.released})
          .then(result => {
            session.close();
            console.log("successfully added, for real")
            return 'Movie successfully added to the databas!';
          })
          .catch(error => {
            session.close();
            throw error;
          })
      }
    })
}

function createMovieForReal(movie) {
  var session = driver.session();
  return session
  .run(
    'CREATE (m: Movie {title: {title}, \
      released: {released}, tagline: {tagline}})',
      {title:movie.title, tagline: movie.tagline, released: movie.released})
  .then(result => {
    session.close();
    console.log("successfully added, for real")
    return 'Movie successfully added to the databas!';
  })
  .catch(error => {
    session.close();
    throw error;
  })
}

function deleteMovie(title) {
  console.log("title: ", title);
  var session = driver.session();
  return session
    .run(
      "MATCH (movie:Movie { title: {title} }) \
      OPTIONAL MATCH (movie)-[r]-() \
      DELETE movie, r\
      RETURN 0", {title})
    .then(result => {
      session.close();
      return 0;
    })
    .catch(error => {
      session.close();
      throw error;
    })
}

function addActorToMovie(title, actorName, role) {
  var session = driver.session();
  return session
    .run(
      "MATCH (a:Person{name:{actorName}}), (m:Movie{title:{title}})\
      MERGE (a)-[relationship:ACTED_IN]->(m)\
      ON CREATE SET relationship.roles = {role}\
      ON MATCH SET relationship.roles = {role}",
      {actorName:actorName, title: title, role: role})
    .then(result => {
      session.close();
      return "Relationship added!";
    })
    .catch(error => {
      session.close();
      throw error;
      return "Something happened.";
    })
}



function getGraph() {
  var session = driver.session();
  return session.run(
    'MATCH (m:Movie)<-[:ACTED_IN]-(a:Person) \
    RETURN m.title AS movie, collect(a.name) AS cast \
    LIMIT {limit}', {limit: 100})
    .then(results => {
      session.close();
      var nodes = [], rels = [], i = 0;
      results.records.forEach(res => {
        nodes.push({title: res.get('movie'), label: 'movie'});
        var target = i;
        i++;

        res.get('cast').forEach(name => {
          var actor = {title: name, label: 'actor'};
          var source = _.findIndex(nodes, actor);
          if (source == -1) {
            nodes.push(actor);
            source = i;
            i++;
          }
          rels.push({source, target})
        })
      });
      return {nodes, links: rels};
    });
}

exports.searchMovies = searchMovies;
exports.getMovie = getMovie;
exports.getGraph = getGraph;
exports.deleteMovie = deleteMovie;
exports.updateMovie = updateMovie;
exports.createMovie = createMovie;
exports.getOtherActors = getOtherActors;
exports.addActorToMovie = addActorToMovie;
