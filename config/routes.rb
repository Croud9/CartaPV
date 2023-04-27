Rails.application.routes.draw do
  root "pv_maps#index"
  get "pv_maps", to: "pv_maps#index"
  post 'update_model/:id', to: "pv_modules#update_model", as: 'update_model'

  resources :pv_modules do
    collection do
      post :import                               
    end
  end
end
