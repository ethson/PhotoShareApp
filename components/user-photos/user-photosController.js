'use strict';

cs142App.controller('UserPhotosController', ['$scope', '$routeParams', '$resource', '$location', '$route',
    function ($scope, $routeParams, $resource, $location, $route) {
    /*
     * Since the route is specified as '/photos/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
        var userId = $routeParams.userId;
        $scope.main.comment ='';
        $scope.commentToAdd = '';
        $scope.people = [];
        $scope.peopleNames =[];
        
        $scope.addMentions = function(item, photo, people) {
            return "@" + item.label;
        };

        var photoFetch = $resource("/photosOfUser/" + userId);
        photoFetch.query( function(photo) {
            var extraInfoFetch, i, userList;
            $scope.userPhotos = photo;
            
            extraInfoFetch = $resource("/user/" + userId);
            extraInfoFetch.get( function(user) {
                $scope.main.status = user.first_name + "'s photos";
                
                userList = $resource("/basic/userList");
                userList.query( function(users) {
                    for(var i =0; i < users.length; i++) {
                        $scope.people.push({label:users[i].first_name, user_id:users[i]._id});
                        $scope.peopleNames.push(users[i].first_name);
                    }
                });
            });
        }, function (err) {
            $scope.noPhotos = true;
        });
        
        
        $scope.addComment = function (photoId, photo) {
            var id = photoId, mentionsArray =[]; 
            var photoCommentFetch = $resource("/commentsOfPhoto/" + id);
            
            var reg = new RegExp(/@([A-Z][^\s]+)/g);
            var result;
            while((result = reg.exec(photo.newComment)) !== null) {
                if($scope.peopleNames.indexOf(result[1]) > -1) {
                    //console.log("success", result[1]);
                    mentionsArray.push($scope.people[$scope.peopleNames.indexOf(result[1])].user_id);
                }
            }

            photoCommentFetch.save({comment: photo.newComment, mentions: mentionsArray}, function(comment) {
                $scope.main.comment = '';
                $route.reload();
            }, function (err) {
                
            });
            
        };
        
        $scope.favoriteToggle = function(photo) {
            photo.favorite = !photo.favorite;
            var favoriteRes =$resource('/toggleFavorite');
            
            favoriteRes.save({id:photo._id});
        };
        
        
        $scope.deleteCommentPhoto = function (photo, comment) {
            var deleteComPhotoRes = $resource('/deletePhotoComment');
            console.log(photo);
            console.log(comment);
            deleteComPhotoRes.save({photo: photo, comment: comment}, function(reply) {
                console.log("I am here now");
                $route.reload();
            });
            
        };
    }]);