module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-connect');


    /**
     * External libs, include lib names
    /* here to have them be included in
    /* vendors.js and not app.js
    /* Cuts down compile time for app.js
     **/
    let extLibs = [
    ];


    let now = new Date(Date.now()).toDateString();

    grunt.initConfig({
        watch: {
            options: {
                interval: 100,
                reload: true,
                // livereload: 3555
            },
            // tests: {
            //     files: [
            //         './build/app.js',
            //         './tests/dataset-management-tests/**/*.js',
            //         './tests/control-flow-tests/**/*.js',
            // ],
            //     tasks: ['browserify:test']
            // },
            js: {
                files: [
                    './js/*.js',
                    'index.html',
                    'examples.js'
                ],
                tasks: [
                    'browserify:dev',
                ]
            }
        },
        browserify: {
            options: {
                browserifyOptions: {
                    debug: true
                }
            },
            dev: {
                options: {
                    external: extLibs,
                    debug: true
                },
                files: {
                    'build/app.js': ['js/main.js'],
                }
            }
        }
    });
};
