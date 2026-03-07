
import pandas as pd
import matplotlib.pyplot as plt
import os

# Construct the path to the dataset
# The script is in src/scripts, and the dataset is in datasets/dairy_consumer_prices
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dataset_path = os.path.join(base_dir, 'datasets', 'dairy_consumer_prices', 'dairy_products_consumer_prices.csv')

# Load the dataset
df = pd.read_csv(dataset_path)

product = 'Mozzarella'  # Change this to the desired product category

# Filter for products
product_df = df[df['product_category'] == product]
unit = product_df['unit_name'].unique()[0]  # Assuming all entries for the product have the same unit

# Convert 'month' to datetime objects
product_df['month'] = pd.to_datetime(product_df['month'])

# Calculate the average price for each month
average_price_per_month = product_df.groupby(['month', 'exact_product', 'production_type'])['price_value'].mean().reset_index()

# Plotting
plt.figure(figsize=(12, 6))
# Get unique combinations of exact_product and production_type
for (exact_product, production_type), group in average_price_per_month.groupby(['exact_product', 'production_type']):
    label = f'{exact_product}'
    if production_type == 'Bio':
        label += ' Bio'
    plt.plot(group['month'], group['price_value'], marker='o', label=label)
plt.title(f'Average Price of {product} Over Time')
plt.xlabel('Month')
plt.ylabel(f'Average Price (CHF per {unit})')
plt.legend()
plt.grid(True)
plt.xticks(rotation=45)
plt.tight_layout()

# Save the plot
output_dir = os.path.join(base_dir, 'charts')
if not os.path.exists(output_dir):
    os.makedirs(output_dir)
plt.savefig(os.path.join(output_dir, f'{product}_price_chart.png'))

print(f"Plot saved to {os.path.join(output_dir, f'{product}_price_chart.png')}")
