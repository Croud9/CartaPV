class Project < ApplicationRecord
  has_one_attached :point_on_map
  has_many :area_configs, dependent: :destroy
end
