Rails.application.routes.draw do
  root "pv_maps#index"
  get "pv_maps", to: "pv_maps#index"
  get "find_configs", to: "pv_maps#find_configs"
  get "export_pdf", to: "export#show"
  post 'update_model/:id', to: "pv_modules#update_model", as: 'update_model'

  resources :pv_modules do
    collection do
      post :import                               
    end
  end

  resources :projects, :area_configs do
  end
end
