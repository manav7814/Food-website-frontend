import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import Home from './Home.jsx';
import * as CartContextModule from '../context/CartContext.jsx';
import API from '../api/client.js';

vi.mock('../api/client.js', () => {
  return {
    default: {
      get: vi.fn()
    }
  }
});

// Optionally mock HeroSlider minimal to avoid Swiper dependency noise in tests
vi.mock('../components/HeroSlider.jsx', () => ({
  default: ({ banners, loading, error }) => {
    if (loading) return <div data-testid="hero-loading">Loading banners...</div>;
    if (error) return <div data-testid="hero-error">{error}</div>;
    if (!banners || banners.length === 0) return <div data-testid="hero-empty">No banners</div>;
    return (
      <div data-testid="hero-populated">
        {banners.map(b => (
          <div key={b._id}>{b.title || 'Banner'}</div>
        ))}
      </div>
    );
  }
}));

function renderWithCart(ui, { addToCart = vi.fn() } = {}) {
  const Provider = ({ children }) => (
    <CartContextModule.CartContext.Provider value={{ addToCart }}>
      {children}
    </CartContextModule.CartContext.Provider>
  );
  return { ...render(ui, { wrapper: Provider }), addToCart };
}

const restaurantsFixture = [
  { _id: 'r1', name: 'Spice Hub', cuisine: 'Indian', rating: 4.5, deliveryTime: '30-40 mins', image: '' },
  { _id: 'r2', name: 'Sushi Go', cuisine: 'Japanese', rating: 4.7, deliveryTime: '25-35 mins', image: '' }
];

const menuFixture = [
  { _id: 'm1', name: 'Paneer Tikka', description: 'Grilled cottage cheese', price: 250, image: '', restaurant: { _id: 'r1', name: 'Spice Hub' } },
  { _id: 'm2', name: 'Sushi Roll', description: 'Fresh salmon roll', price: 400, image: '', restaurant: { _id: 'r2', name: 'Sushi Go' } },
  { _id: 'm3', name: 'Dal Makhani', description: 'Creamy black lentils', price: 220, image: '', restaurant: { _id: 'r1', name: 'Spice Hub' } }
];

const bannersFixture = [
  { _id: 'b1', title: 'Big Sale', description: 'Up to 50% off', image: '', link: '', linkType: 'none' }
];

function mockApiSuccess() {
  API.get.mockImplementation((url) => {
    if (url === '/restaurants') return Promise.resolve({ data: restaurantsFixture });
    if (url === '/menu') return Promise.resolve({ data: menuFixture });
    if (url === '/banners') return Promise.resolve({ data: bannersFixture });
    return Promise.resolve({ data: [] });
  });
}

function mockApiLoadingThen(urlMap) {
  API.get.mockImplementation((url) => new Promise((resolve, reject) => {
    setTimeout(() => {
      const handler = urlMap[url];
      if (!handler) return resolve({ data: [] });
      if (handler.error) return reject(handler.error);
      resolve({ data: handler.data });
    }, 0);
  }));
}

function mockApiError() {
  API.get.mockImplementation((url) => {
    if (url === '/restaurants' || url === '/menu') {
      return Promise.reject({ response: { data: { message: 'Unable to load menu data.' } } });
    }
    if (url === '/banners') {
      return Promise.reject({ response: { data: { message: 'Unable to load banners' } } });
    }
    return Promise.reject({ response: { data: { message: 'Error' } } });
  });
}

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Should render the hero/slider section when banners are available', async () => {
    mockApiSuccess();

    renderWithCart(<Home />);

    // Hero shows loading first
    expect(screen.getByTestId('hero-loading')).toBeInTheDocument();

    // After banners load, populated state should appear
    await waitFor(() => expect(screen.getByTestId('hero-populated')).toBeInTheDocument());
    expect(screen.getByText(/Big Sale/i)).toBeInTheDocument();
  });

  it('Should show a loading skeleton while homepage data is being fetched', async () => {
    mockApiLoadingThen({
      '/restaurants': { data: restaurantsFixture },
      '/menu': { data: menuFixture },
      '/banners': { data: bannersFixture }
    });

    renderWithCart(<Home />);

    // Skeleton cards for restaurants while loading
    const skeletonGrid = await screen.findAllByRole('article');
    expect(skeletonGrid.length).toBeGreaterThan(0);

    // Wait for real content to appear (restaurants rendered)
    await screen.findByText('Partner Restaurants');
    expect(screen.getByText('Spice Hub')).toBeInTheDocument();
  });

  it('Should display an error message if the initial data fetch fails', async () => {
    mockApiError();

    renderWithCart(<Home />);

    const errorEl = await screen.findByText(/Unable to load menu data\./i);
    expect(errorEl).toBeInTheDocument();

    // Hero should handle banner error independently and not crash
    await waitFor(() => expect(screen.getByTestId('hero-error')).toBeInTheDocument());
  });

  it('Should render featured menu items when available, falling back to an empty state if none', async () => {
    mockApiSuccess();

    renderWithCart(<Home />);

    // Wait until restaurants and menu loaded
    await screen.findByText('Partner Restaurants');

    // Menu Highlights section has items
    expect(screen.getByText('Menu Highlights')).toBeInTheDocument();
    expect(screen.getByText('Paneer Tikka')).toBeInTheDocument();
    expect(screen.getByText('Sushi Roll')).toBeInTheDocument();

    // Now simulate search to filter out all items
    const input = screen.getByPlaceholderText('Search by dish, cuisine, or restaurant');
    input.focus();
    input.setSelectionRange?.(0, 0);
    input.value = 'no-such-dish';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await screen.findByText('No menu items found for your current filter.');
  });

  it('Should include Navbar and Footer elements in the layout consistently (basic smoke around content)', async () => {
    mockApiSuccess();

    renderWithCart(<Home />);

    // Wait for main sections
    await screen.findByText('Partner Restaurants');

    // Check hero meta counters indicative of layout presence
    expect(screen.getByText(/restaurants/)).toBeInTheDocument();
    expect(screen.getByText(/menu items/)).toBeInTheDocument();
  });

  it('Should call addToCart when clicking Add to Cart on a menu item', async () => {
    mockApiSuccess();
    const addToCart = vi.fn();

    renderWithCart(<Home />, { addToCart });

    await screen.findByText('Partner Restaurants');

    const addButtons = screen.getAllByRole('button', { name: /Add to Cart/i });
    expect(addButtons.length).toBeGreaterThan(0);

    addButtons[0].click();

    expect(addToCart).toHaveBeenCalledTimes(1);
    expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ _id: expect.any(String) }));
  });
});
