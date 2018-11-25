var api = require('./neo4jApi');

function MovieModel(){
  var self = this;
  this.title = ko.observable();
  this.released = ko.observable();
  this.tagline = ko.observable();
}

function MovieViewModel() {
  var model = new MovieModel();
  function loadModel(data) {
    model.title(data.title);
    model.released(data.released);
    model.tagline(data.tagline);
  }

  return {
    Model: model,
    LoadModel: loadModel
  };
}

var viewModel = new MovieViewModel();
ko.applyBindings(viewModel.Model);

$(function () {
  renderGraph();
  search();

  $("#search").submit(e => {
    e.preventDefault();
    search();
  });
});

var button = $('<div>');
$('<button class="btn btn-default" id = "createButton" id="createMovieButton" data-toggle="modal" data-target="#createModal">Add</button>').appendTo(button)
  .one('click', function() {
      var data = {
        title: "",
        released: 2018,
        tagline: ""
      };

      viewModel.LoadModel(data);
      $('#SaveCreateButton').click(function() {
        console.log("clicked on save from modal")
        data = {
          title: viewModel.Model.title(),
          released: viewModel.Model.released(),
          tagline: viewModel.Model.tagline()
        }
        api
          .createMovie(data)
          .then(response => {
              $("#messageModal").html(response);
              jQuery("#dialogModal").modal('toggle');
              search();
            });
      });
      $(this).off('click');
  })
var buttons = $('#buttons');
button.appendTo(buttons);


function showMovie(title) {
  api
    .getMovie(title)
    .then(movie => {
      if (!movie) return;

      $("#title").text(movie.title);
      //$("#poster").attr("src", "http://neo4j-contrib.github.io/developer-resources/language-guides/assets/posters/" + movie.title + ".jpg");
      //$("#poster").attr("alt", "Poster");
      var $list = $("#crew").empty();
      movie.cast.forEach(cast => {
        $list.append($("<li>" + cast.name + " " + cast.job + (cast.job == "acted" ? " as " + cast.role : "") + "</li>"));
      });
    }, "json");
}

function deleteMovie(title) {
  api
    .deleteMovie(title)
    .then(responseCode => {
      console.log(responseCode);
      if (responseCode === 0 ) {
        search();
      }
    })
}

function updateMovie(movie) {
  api
    .updateMovie(movie)
    .then(responseCode => {
      console.log("responseCode: ", responseCode);
      if (responseCode === 0) {
        search();
      }
    })
}


function search() {
  var query = $("#search").find("input[name=search]").val();
  api
    .searchMovies(query)
    .then(movies => {
      var t = $("table#results tbody").empty();

      if (movies) {
        movies.forEach(movie => {
          var aRow = $("<tr></tr>")

          $("<td class='movie'>" + movie.title + "</td><td>" + movie.released + "</td><td>" + movie.tagline + "</td>").appendTo(aRow);

          $("<td class=\"ikonRead\"><button class=\"btn btn-default viewButton\"><span><i class=\"fa fa-eye\"></i></span> </button></td>").appendTo(aRow)
            .click(function() {
              showMovie(movie.title);
            });

          $("<td class=\"ikon\"><button type = \"button\" class=\"btn btn-default\"  data-toggle=\"modal\" data-target=\"#updateModal\"><span> <i class=\"fa fa-pencil\"></i> </span></button> </td> ").appendTo(aRow)
            .click(function() {
                console.log("Editing this: ", movie.title)
                var data = {
                  title: movie.title,
                  released: movie.released,
                  tagline: movie.tagline
                };
                viewModel.LoadModel(data);
                $('#SaveButton').click(function() {
                  data = {
                    title: viewModel.Model.title(),
                    released: viewModel.Model.released(),
                    tagline: viewModel.Model.tagline()
                  }
                  updateMovie(data);
                });
            })

          $("<td  class=\"ikon\"> <button class=\"btn btn-default deleteButton\"><span><i class=\"fa fa-trash\"></i></span> </button></td>").appendTo(aRow)
            .click(function() {
              deleteMovie(movie.title);
            })

          $(aRow).appendTo(t);
          });

        var first = movies[0];
        if (first) {
          showMovie(first.title);
        }
      }
    });
}

//only design
function renderGraph() {
  var width = 800, height = 800;
  var force = d3.layout.force()
    .charge(-200).linkDistance(30).size([width, height]);

  var svg = d3.select("#graph").append("svg")
    .attr("width", "100%").attr("height", "100%")
    .attr("pointer-events", "all");

  api
    .getGraph()
    .then(graph => {
      force.nodes(graph.nodes).links(graph.links).start();

      var link = svg.selectAll(".link")
        .data(graph.links).enter()
        .append("line").attr("class", "link");

      var node = svg.selectAll(".node")
        .data(graph.nodes).enter()
        .append("circle")
        .attr("class", d => {
          return "node " + d.label
        })
        .attr("r", 10)
        .call(force.drag);

      // html title attribute
      node.append("title")
        .text(d => {
          return d.title;
        });

      // force feed algo ticks
      force.on("tick", () => {
        link.attr("x1", d => {
          return d.source.x;
        }).attr("y1", d => {
          return d.source.y;
        }).attr("x2", d => {
          return d.target.x;
        }).attr("y2", d => {
          return d.target.y;
        });

        node.attr("cx", d => {
          return d.x;
        }).attr("cy", d => {
          return d.y;
        });
      });
    });
}
