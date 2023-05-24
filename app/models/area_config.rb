class AreaConfig < ApplicationRecord
  has_one_attached :pv_config_on_map
  belongs_to :project
end
