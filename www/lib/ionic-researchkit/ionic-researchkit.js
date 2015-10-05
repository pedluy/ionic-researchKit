/** 
* Author: Nino Guba
* Date: 08-26-2015
* Directives for ResearchKit in Ionic
*
* Adapted from the following:
* ion-slide-box (https://github.com/driftyco/ionic)
* ion-wizard (https://github.com/arielfaur/ionic-wizard)
*
* Required dependencies:
* checklist-model (https://github.com/vitalets/checklist-model)
*/
angular.module('ionicResearchKit',[])
//======================================================================================
// This provides a counterpart of Apple's ResearchKit for Ionic apps
// =====================================================================================


//======================================================================================
// Usage: 
// =====================================================================================
.service('irkResults', function() {
    var service = this;
    var results = null;

    service.initResults = function() {
        results = {
            "start": new Date(),
            "end": null,
            "childResults": []
        }
    };

    service.getResults = function() {
        return results;
    }

    service.addResult = function(index, formData) {
        if (!results) service.initResults();

        if (index == results.childResults.length)
        {
            results.childResults.push({
                "index": index,
                "start": new Date(),
                "end": null
            });            
        }
        else
        {
            var step = angular.element(document.querySelectorAll('irk-task.irk-slider-slide')[index].querySelector('.irk-step'));
            var stepId = step.attr('id');
            var stepType = step.prop('tagName');
            var stepValue = formData[stepId];

            results.childResults[index].id = stepId;
            results.childResults[index].type = stepType;
            if (stepType != 'IRK-INSTRUCTION-STEP')
                results.childResults[index].answer = (stepValue?stepValue:null);

            results.childResults[index].end = new Date();
            results.end = new Date();
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkOrderedTasks', [
    '$rootScope',
    '$timeout',
    '$compile',
    '$ionicSlideBoxDelegate',
    '$ionicHistory',
    '$ionicScrollDelegate',
    '$ionicNavBarDelegate',
    '$ionicActionSheet',
    'irkResults',
    function($rootScope, $timeout, $compile, $ionicSlideBoxDelegate, $ionicHistory, $ionicScrollDelegate, $ionicNavBarDelegate, $ionicActionSheet, irkResults) {
        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                autoPlay: '=',
                doesContinue: '@',
                slideInterval: '@',
                showPager: '@',
                pagerClick: '&',
                disableScroll: '@',
                onSlideChanged: '&',
                activeSlide: '=?'
            },
            controller: ['$scope', '$rootScope', '$element', '$attrs', function($scope, $rootScope, $element, $attrs) {
                var _this = this;

                var slider = new ionic.views.Slider({
                    el: $element[0],
                    auto: false,
                    continuous: false,
                    startSlide: $scope.activeSlide,
                    slidesChanged: function() {
                        $scope.currentSlide = slider.currentIndex();

                        // Force a slideChanged event on init
                        $scope.$parent.$broadcast('slideBox.slideChanged', slider.currentIndex(), slider.slidesCount());

                        // Try to trigger a digest
                        $timeout(function() {});
                    },
                    callback: function(slideIndex) {
                        $scope.currentSlide = slideIndex;
                        $scope.onSlideChanged({ index: $scope.currentSlide, $index: $scope.currentSlide});
                        $scope.$parent.$broadcast('slideBox.slideChanged', slideIndex, slider.slidesCount());
                        $scope.activeSlide = slideIndex;

                        // Try to trigger a digest
                        $timeout(function() {});
                    }
                });

                slider.enableSlide(false);

                $scope.$watch('activeSlide', function(nv) {
                    if (angular.isDefined(nv)) {
                        slider.slide(nv);
                    }
                });

                $scope.$on('slideBox.setSlide', function(e, index) {
                    slider.slide(index);
                });

                //Exposed for testing
                this.__slider = slider;

                var deregisterInstance = $ionicSlideBoxDelegate._registerInstance(
                    slider, $attrs.delegateHandle, function() {
                        return $ionicHistory.isActiveScope($scope);
                    }
                );
                
                $scope.$on('$destroy', function() {
                    deregisterInstance();
                    slider.kill();
                });

                this.slidesCount = function() {
                    return slider.slidesCount();
                };

                $timeout(function() {
                    slider.load();
                });

                $scope.doStepBack = function() {
                    console.log('Clicked back');
                    slider.prev();
                };

                $scope.doStepNext = function() {
                    console.log('Clicked next');
                    $scope.doNext();
                };

                $scope.doSkip = function() {
                    console.log('Clicked skip');
                    $scope.doNext();
                };

                $scope.doNext = function() {
                    $scope.doSave();

                    if (slider.currentIndex() < slider.slidesCount()-1)
                        slider.next();
                    else
                        $scope.doEnd();
                }

                $scope.doCancel = function() {
                    console.log('Clicked cancel');

                    // Show the action sheet
                    var hideSheet = $ionicActionSheet.show({
                        destructiveText: 'End Task',
                        cancelText: 'Cancel',
                        cancel: function() {
                            hideSheet();
                        },
                        destructiveButtonClicked: function(index) {
                            console.log('Clicked end task');
                            $scope.doSave();
                            $scope.doEnd();
                            return true;
                        }
                    });
                };

                $scope.doEnd = function() {
                    $scope.$parent.closeModal();
                }

                $scope.$on("step:Previous", function() {
                    slider.prev();
                });
                
                $scope.$on("step:Next", function() {
                    $scope.doNext();
                });

                //This is called when input changes (faster than form.$dirty)
                $scope.dirty = function() {
                    $scope.isPristine = false;
                };

                //This is to initialize what will hold the results
                $scope.formData = {};
                irkResults.initResults();

                //This is called to capture the results
                $scope.doSave = function() {
                    irkResults.addResult(slider.currentIndex(), $scope.formData);
                }; 

                $scope.$on("slideBox.slideChanged", function(e, index) {
                    $scope.doSave();
                });

            }],

            template:
                '<div class="slider irk-slider">'+
                '<div class="slider-slides irk-slider-slides" ng-transclude>'+
                '</div>'+
                '<ion-footer-bar class="bar-subfooter irk-bottom-bar">'+
                '<button class="button button-block button-outline button-positive irk-bottom-button" ng-click="doStepNext()" ng-disabled="isPristine" irk-step-next>Next</button>'+
                '</ion-footer-bar>'+
                '<ion-footer-bar class="irk-bottom-bar">'+
                '<button class="button button-block button-clear button-positive irk-bottom-button" ng-click="doSkip()" irk-step-skip>Skip this question</button>'+
                '</ion-footer-bar>'+
                '</div>',

            link: function(scope, element, attrs, controller) {
                //Insert Header
                var stepHeader = angular.element(
                    '<ion-header-bar>'+
                    '<div class="buttons">'+
                    '<button class="button button-clear button-positive icon ion-ios-arrow-left" ng-click="doStepBack()" irk-step-previous></button>'+
                    '</div>'+
                    '<h1 class="title" irk-step-title></h1>'+
                    '<div class="buttons">'+
                    '<button class="button button-clear button-positive" ng-click="doCancel()">Cancel</button>'+
                    '</div>'+
                    '</ion-header-bar>'
                    );
                element.parent()[0].insertBefore(stepHeader[0], element[0]);
                $compile(stepHeader)(scope);
            }
        };
}])

.directive('irkTask', function() {
    return {
        restrict: 'E',
        require: '^irkOrderedTasks',
        link: function(scope, element, attrs, controller) {
            element.addClass('slider-slide irk-slider-slide');
        }
    };
})

.directive('irkStepTitle', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                element.text('Step ' + (index+1) + ' of ' + count);
            });
        }
    }
})

.directive('irkStepPrevious', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index) {
                element.toggleClass('ng-hide', index == 0);
            });
        }
    }
})

.directive('irkStepNext', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                if (index == count - 1)
                    element.text("Done");
                else
                    element.text("Next");

                //Hide for instruction step
                var form = angular.element(document.querySelectorAll('irk-task.irk-slider-slide')[index]).find('form');
                element.toggleClass('ng-hide', form.length == 0);

                //Enable only when current form is dirtied
                scope.isPristine = form.hasClass('ng-pristine');
            });
        }
    }
})

.directive('irkStepSkip', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            //Hide when input is required
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var input = angular.element(document.querySelectorAll('irk-task.irk-slider-slide')[index]).find('input');
                element.toggleClass('ng-hide', input.length == 0 || scope.$eval(input.attr('ng-required')));
            });
        }
    }
})

//======================================================================================
// Usage: <irk-instruction-step id="s1" title="Your title here." text="Additional text can go here." />
// =====================================================================================
.directive('irkInstructionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return 	'<div class="irk-offcentered-container"><div class="irk-offcentered-content">'+
                '<h3>'+attr.title+'</h3>'+
                (attr.text ? '<p>'+attr.text+'</p>' : '')+
                (attr.link ? '<a class="button button-clear button-positive" href="'+attr.link+'" target="_system">'+(attr.linkText ? attr.linkText : 'Learn more')+'</a>' : '')+
                '<br><br>'+
                '<button class="button button-outline button-positive" ng-click="$parent.doNext()">'+(attr.buttonText ? attr.buttonText : 'Get Started')+'</button>'+
                '</div></div>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }        
    }
})

//======================================================================================
// Usage: <irk-scale-question-step id="q1" title="Your question here." text="Additional text can go here." min="1" max="10" step="1" value="5" optional="false"/>
// =====================================================================================
.directive('irkScaleQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return 	'<form name="form.'+attr.id+'" class="irk-slider">'+
                '<div class="irk-centered">'+
                '<h3>'+attr.title+'</h3>'+
                (attr.text ? '<p>'+attr.text+'</p>' : '')+
                '</div>'+
                '<div class="irk-offcentered-container"><div class="irk-offcentered-content">'+
                ''+
                '<h4>{{$parent.formData.'+attr.id+' || \'&nbsp;\'}}</h4>'+
                '<div class="range">'+
                attr.min+
                '<input type="range" name="'+attr.id+'" min="'+attr.min+'" max="'+attr.max+'" step="'+attr.step+'" value="'+attr.value+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                attr.max+
                '</div>'+
                '</div></div>'+
                '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-boolean-question-step id="q1" title="Your question here." text="Additional text can go here." true-value="true" false-value="false" true-text="Yes" false-text="No" optional="false"/>
// =====================================================================================
.directive('irkBooleanQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return 	'<form name="form.'+attr.id+'" class="irk-slider">'+
                '<div class="irk-centered">'+
                '<h3>'+attr.title+'</h3>'+
                (attr.text ? '<p>'+attr.text+'</p>' : '')+
                '</div>'+
                '<div class="irk-offcentered-container"><div class="irk-offcentered-content">'+
                '<div class="list">'+
                '<label class="item item-radio">'+
                '<input type="radio" name="'+attr.id+'" value="'+(attr.trueValue?attr.trueValue:'true')+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                '<div class="item-content irk-item-content">'+(attr.trueText?attr.trueText:(attr.trueValue?attr.trueValue:'True'))+'</div>'+
                '<i class="radio-icon ion-checkmark"></i>'+
                '</label>'+
                '<label class="item item-radio">'+
                '<input type="radio" name="'+attr.id+'" value="'+(attr.falseValue?attr.falseValue:'false')+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                '<div class="item-content irk-item-content">'+(attr.falseText?attr.falseText:(attr.falseValue?attr.falseValue:'False'))+'</div>'+
                '<i class="radio-icon ion-checkmark"></i>'+
                '</label>'+
                '</div>'+
                '</div></div>'+
                '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-text-question-step id="q1" title="Your question here." text="Additional text can go here." max-length="0" multiple-lines="true" placeholder="" optional="false"/>
// =====================================================================================
.directive('irkTextQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider">'+
                '<div class="irk-centered">'+
                '<h3>'+attr.title+'</h3>'+
                (attr.text ? '<p>'+attr.text+'</p>' : '')+
                '</div>'+
                '<div class="irk-offcentered-container"><div class="irk-offcentered-content">'+
                '<div class="list">'+
                '<label class="item item-input">'+
                (attr.multipleLines=="false"
                ?'<input type="text" placeholder="'+(attr.placeholder?attr.placeholder:'')+'" name="'+attr.id+'" '+(attr.maxLength && parseInt(attr.maxLength,10)>0?'maxlength="'+attr.maxLength+'"':'')+' ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'
                :'<textarea rows="8" placeholder="'+(attr.placeholder?attr.placeholder:'')+'" name="'+attr.id+'" '+(attr.maxLength && parseInt(attr.maxLength,10)>0?'maxlength="'+attr.maxLength+'"':'')+' ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()"></textarea>'
                )+
                '</label>'+
                '</div>'+
                '</div></div>'+
                '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-text-choice-question-step id="q1" title="Your question here." text="Additional text can go here." style="single/multiple" optional="false"></irk-text-choice-question-step>
// =====================================================================================
.directive('irkTextChoiceQuestionStep', function() {
    return {
        restrict: 'E',
        transclude: true,
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider">'+
                '<div class="irk-centered">'+
                '<h3>'+attr.title+'</h3>'+
                (attr.text ? '<p>'+attr.text+'</p>' : '')+
                '</div>'+
                '<div class="irk-offcentered-container"><div class="irk-offcentered-content">'+
                '<div class="list" ng-transclude>'+
                '</div>'+
                '</div></div>'+
                '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-text-choice id="q1" value="choice" text="Your choice." detail-text="Additional text can go here."/>
// =====================================================================================
.directive('irkTextChoice', function() {
    return {
        restrict: 'E',
        require: '^?irkTextChoiceQuestionStep',
        template: function(elem, attr) {
            return  '<label class="item item-radio">'+
                (elem.parent().attr("style")=="multiple"?
                '<input type="checkbox" name="'+elem.parent().attr("id")+'" value="'+attr.value+'" checklist-model="$parent.$parent.formData.'+elem.parent().attr("id")+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.$parent.$parent.dirty()">'
                :
                '<input type="radio" name="'+elem.parent().attr("id")+'" value="'+attr.value+'" ng-model="$parent.$parent.formData.'+elem.parent().attr("id")+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.$parent.dirty()">'
                )+
                '<div class="item-content irk-item-content">'+
                attr.text+
                (attr.detailText?'<p>'+attr.detailText+'</p>':'')+
                '</div>'+
                '<i class="radio-icon ion-checkmark"></i>'+
                '</label>'
        }
    }
})
