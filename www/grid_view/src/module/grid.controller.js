/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// This file is part of Buildbot.  Buildbot is free software: you can
// redistribute it and/or modify it under the terms of the GNU General Public
// License as published by the Free Software Foundation, version 2.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more
// details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//
// Copyright Buildbot Team Members

class Grid {
    constructor($scope, $stateParams, $state, resultsService, dataService, bbSettingsService) {
        this.onChange = this.onChange.bind(this);
	this.changeResult = this.changeResult.bind(this);
	this.toggleTag = this.toggleTag.bind(this);
	this.resetTags = this.resetTags.bind(this);
        this.refresh = this.refresh.bind(this);
        this.isBuilderDisplayed = this.isBuilderDisplayed.bind(this);
        this.isTagToggled = this.isTagToggled.bind(this);
        this.$scope = $scope;
        this.$stateParams = $stateParams;
        this.$state = $state;
        _.mixin(this.$scope, resultsService);
        this.data = dataService.open().closeOnDestroy(this.$scope);

        this.branch = this.$stateParams.branch;
	this.tags = this.$stateParams.tag != null ? this.$stateParams.tag : [];
        if (!angular.isArray(this.tags)) {
            this.tags = [this.tags];
        }
        this.result = this.$stateParams.result;
        // XXX: Angular ngOptions tag only works with string values. Force
        // convert the result code to string.
        this.results = ((() => {
            const result = [];
            for (let c in resultsService.resultsTexts) {
                const t = resultsService.resultsTexts[c];
                result.push({code: c + '', text: t});
            }
            return result;
        })());

        const settings = bbSettingsService.getSettingsGroup('Grid');
        this.revisionLimit = settings.revisionLimit.value;
        this.changeFetchLimit = settings.changeFetchLimit.value;
        this.buildFetchLimit = settings.buildFetchLimit.value;
        this.fullChanges = settings.fullChanges.value;
        this.leftToRight = settings.leftToRight.value;

        this.changes = this.data.getChanges({
            limit: this.changeFetchLimit,
            order: '-changeid',
            branch: this.branch
        });
        this.builders = this.data.getBuilders();

        this.builders.onChange = this.onChange;
        this.changes.onChange = this.onChange;
  }

    dataReady() {
        for (let collection of [this.builders, this.changes]) {
	     if (!(collection.$resolved && (collection.length > 0))) {
	          return false;
             }
        }
        return true;
    }

    dataFetched() {
        for (let collection of [this.changes, this.builders]) {
            if (!collection.$resolved) {
                return false;
            }
        }
        return true;
    }

    onChange() {
        let bset, c, req;
        let change, i, builder;
        if (!this.dataReady()) {
            return;
        }
	console.log('On CHANGE');
        let changes = {};
        const branches = {};

        for (c of Array.from(this.changes)) {
	    if (c.builds.length ==0) {
	    	continue;
	    }
            changes[c.changeid] = c;
	    branches[c.branch] = true;
        } 

	// only keep the @revisionLimit most recent changes for display
	changes = ((() => {
	const result = [];
	     for (let cid of Object.keys(changes || {})) {
	         change = changes[cid];
	         result.push(change);
	     }
	     return result;
	})());
        if (this.leftToRight) {
            changes.sort((a, b) => a.changeid - b.changeid);
            if (changes.length > this.revisionLimit) {
                changes = changes.slice(changes.length - this.revisionLimit);
            }
        } else {
            changes.sort((a, b) => b.changeid - a.changeid);
            if (changes.length > this.revisionLimit) {
                changes = changes.slice(0, this.revisionLimit);
            }
        }
        this.$scope.changes = changes;

        this.$scope.branches = ((() => {
            const result1 = [];
            for (let br in branches) {
                result1.push(br);
            }
            return result1;
        })());

        for (builder of Array.from(this.builders)) {
            builder.builds = {};
        }

        const buildersById = {};
        for (c of Array.from(this.$scope.changes)) {
    		const builds = c.builds;
		for (let build of Array.from(c.builds)) {
			builder = this.builders.get(build.builderid);
			if (!this.isBuilderDisplayed(builder)) {
	                       	continue;
                    	}
			if ((this.result != null) && (this.result !== '') && !isNaN(this.result)) {
                            	if (parseInt(build.results) !== parseInt(this.result)) {
                                	continue;
                        	}
                    	}	
			buildersById[builder.builderid] = builder;
			if (!(c.changeid in builder.builds)) {
				builder.builds[c.changeid] = []
			}
			builder.builds[c.changeid].push(build);
		}
	}

        return this.$scope.builders = ((() => {
            const result2 = [];
            for (i of Object.keys(buildersById || {})) {
                builder = buildersById[i];
                result2.push(builder);
            }
            return result2;
        })());
    }
    changeBranch(branch) {
        this.branch = branch;
        return this.refresh();
    }

    changeResult(result) {
        this.result = result;
        return this.refresh();
    }

    toggleTag(tag) {
        const i = this.tags.indexOf(tag);
        if (i < 0) {
            this.tags.push(tag);
        } else {
            this.tags.splice(i, 1);
        }
        return this.refresh();
    }
    resetTags() {
        this.tags = [];
        return this.refresh();
    }

    refresh() {
        const params = {
            branch: this.branch,
            tag: this.tags.length === 0 ? undefined : this.tags,
            result: this.result
        };

        this.onChange();
    }

    isBuilderDisplayed(builder) {
        for (let tag of Array.from(this.tags)) {
            if (builder.tags.indexOf(tag) < 0) {
                return false;
            }
        }
        return true;
    }

    isTagToggled(tag) {
        return this.tags.indexOf(tag) >= 0;
    }

}


angular.module('grid_view')
.controller('gridController', ['$scope', '$stateParams', '$state', 'resultsService', 'dataService', 'bbSettingsService', Grid]);
