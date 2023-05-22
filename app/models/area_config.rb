class AreaConfig < ApplicationRecord
  has_many_attached :files
  belongs_to :project
end
