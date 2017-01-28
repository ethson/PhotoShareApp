'use strict';

cs142App.controller('FavoritesController', ['$scope', '$routeParams', '$resource', '$location', '$route', 'Lightbox',
    function ($scope, $routeParams, $resource, $location, $route, Lightbox) {
          
          $scope.main.status = "Your favorites' page";
        
          var favoritesRes = $resource('/getFavorites');
          favoritesRes.query( function(photoList) {
              if(photoList.length === 0){
                  $scope.hasFavorites = false;
              } else {
                  $scope.hasFavorites = true;
                  $scope.images = photoList;
              }
          });
        
          $scope.unfavorite = function(image) {
              image.favorited = false;
              var favoriteRes =$resource('/toggleFavorite');
              favoriteRes.save({id: image.id});
          };
        

          $scope.openLightboxModal = function (index) {
            Lightbox.openModal($scope.images, index);
          };
        
    }]);