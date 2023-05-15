class Project < ApplicationRecord
  has_many :area_configs, dependent: :destroy
end
