(function() {
  angular.module("angular-bacon", []).run([
    "$rootScope", "$parse", function($rootScope, $parse) {
      var watcherBus;
      watcherBus = function(scope, watchExp, objectEquality, watchMethod) {
        var bus, initialValue;
        bus = new Bacon.Bus;
        scope[watchMethod](watchExp, function(newValue) {
          return bus.push(newValue);
        }, objectEquality);
        scope.$on('$destroy', bus.end);
        initialValue = scope.$eval(watchExp);
        if (typeof initialValue !== "undefined") {
          return bus.toProperty(initialValue);
        } else {
          return bus.toProperty();
        }
      };
      $rootScope.$watchAsProperty = function(watchExp, objectEquality) {
        return watcherBus(this, watchExp, objectEquality, '$watch');
      };
      $rootScope.$watchCollectionAsProperty = function(watchExp, objectEquality) {
        return watcherBus(this, watchExp, objectEquality, '$watchCollection');
      };
      $rootScope.digestObservables = function(observables) {
        var self;
        self = this;
        return angular.forEach(observables, function(observable, key) {
          return observable.digest(self, key);
        });
      };
      Bacon.Observable.prototype.digest = function($scope, prop) {
        var propSetter, unsubscribe;
        propSetter = $parse(prop).assign;
        unsubscribe = this.subscribe(function(e) {
          if (e.hasValue()) {
            if (!$scope.$$phase) {
              return $scope.$apply(function() {
                return propSetter($scope, e.value());
              });
            } else {
              return propSetter($scope, e.value());
            }
          }
        });
        $scope.$on('$destroy', unsubscribe);
        return this;
      };
      return $rootScope.$asEventStream = function(event, names) {
        var $scope;
        $scope = this;
        return Bacon.fromBinder(function(sink) {
          var end;
          end = $scope.$on(event, function(event) {
            var ret;
            if (names) {
              event.args = Bacon._.object(names, Array.prototype.slice.call(arguments, 1));
            } else {
              event.args = Array.prototype.slice.call(arguments, 1);
            }
            ret = sink(event);
            if (ret === Bacon.noMore) {
              return end();
            }
          });
          $scope.$on('$destroy', function() {
            return sink(new Bacon.End());
          });
          return end;
        });
      };
    }
  ]);

}).call(this);
