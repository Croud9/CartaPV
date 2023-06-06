#!/usr/bin/env bash
# exit on error
set -o errexit

bundle install
bundle exec bootsnap precompile --gemfile app/ lib/
bundle exec rake assets:precompile
bundle exec rake db:migrate