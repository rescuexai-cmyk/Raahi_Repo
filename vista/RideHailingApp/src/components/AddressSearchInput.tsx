import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { googleMapsService, PlaceSuggestion, LocationCoordinate } from '../services/mapsService';

interface AddressSearchInputProps {
  placeholder?: string;
  onAddressSelect?: (address: SelectedAddress) => void;
  onLocationSelect?: (location: LocationCoordinate) => void;
  currentLocation?: LocationCoordinate;
  searchRadius?: number;
  value?: string;
  style?: any;
  inputStyle?: any;
  listStyle?: any;
  showCurrentLocationButton?: boolean;
  showRecentAddresses?: boolean;
  recentAddresses?: SavedAddress[];
  onCurrentLocationPress?: () => void;
  clearOnSelect?: boolean;
  autoFocus?: boolean;
}

interface SelectedAddress {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  coordinates: LocationCoordinate;
  types: string[];
}

interface SavedAddress {
  id: string;
  title: string;
  subtitle: string;
  coordinates: LocationCoordinate;
  type: 'home' | 'work' | 'recent' | 'favorite';
}

const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  placeholder = 'Search for an address...',
  onAddressSelect,
  onLocationSelect,
  currentLocation,
  searchRadius = 10000,
  value = '',
  style,
  inputStyle,
  listStyle,
  showCurrentLocationButton = true,
  showRecentAddresses = true,
  recentAddresses = [],
  onCurrentLocationPress,
  clearOnSelect = true,
  autoFocus = false,
}) => {
  const [searchText, setSearchText] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(recentAddresses);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setSearchText(value);
  }, [value]);

  useEffect(() => {
    if (showSuggestions) {
      Animated.timing(animatedHeight, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [showSuggestions]);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    
    try {
      const results = await googleMapsService.getPlacesSuggestions(
        query,
        currentLocation,
        searchRadius
      );
      
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setSearchText(text);
    
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set new timeout for search
    searchTimeout.current = setTimeout(() => {
      searchAddresses(text);
    }, 500);
  };

  const handleSuggestionPress = async (suggestion: PlaceSuggestion) => {
    try {
      setLoading(true);
      
      // Get place details to get coordinates
      const placeDetails = await googleMapsService.getPlaceDetails(suggestion.placeId);
      
      if (placeDetails) {
        const selectedAddress: SelectedAddress = {
          placeId: suggestion.placeId,
          description: suggestion.description,
          mainText: suggestion.structuredFormatting.main_text,
          secondaryText: suggestion.structuredFormatting.secondary_text,
          coordinates: {
            lat: placeDetails.lat,
            lng: placeDetails.lng,
          },
          types: suggestion.types,
        };

        if (clearOnSelect) {
          setSearchText('');
        } else {
          setSearchText(suggestion.description);
        }
        
        setShowSuggestions(false);
        Keyboard.dismiss();
        
        // Add to recent addresses
        const newRecentAddress: SavedAddress = {
          id: suggestion.placeId,
          title: suggestion.structuredFormatting.main_text,
          subtitle: suggestion.structuredFormatting.secondary_text,
          coordinates: selectedAddress.coordinates,
          type: 'recent',
        };
        
        setSavedAddresses(prev => {
          const filtered = prev.filter(addr => addr.id !== newRecentAddress.id);
          return [newRecentAddress, ...filtered].slice(0, 5); // Keep only 5 recent
        });

        // Call callbacks
        if (onAddressSelect) {
          onAddressSelect(selectedAddress);
        }
        
        if (onLocationSelect) {
          onLocationSelect(selectedAddress.coordinates);
        }
      }
    } catch (error) {
      console.error('Error selecting address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavedAddressPress = (address: SavedAddress) => {
    const selectedAddress: SelectedAddress = {
      placeId: address.id,
      description: `${address.title}, ${address.subtitle}`,
      mainText: address.title,
      secondaryText: address.subtitle,
      coordinates: address.coordinates,
      types: [],
    };

    if (clearOnSelect) {
      setSearchText('');
    } else {
      setSearchText(`${address.title}, ${address.subtitle}`);
    }
    
    setShowSuggestions(false);
    Keyboard.dismiss();

    if (onAddressSelect) {
      onAddressSelect(selectedAddress);
    }
    
    if (onLocationSelect) {
      onLocationSelect(address.coordinates);
    }
  };

  const handleCurrentLocationPress = () => {
    setSearchText('Current Location');
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    if (onCurrentLocationPress) {
      onCurrentLocationPress();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (searchText.length === 0 && (savedAddresses.length > 0 || showCurrentLocationButton)) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  const clearSearch = () => {
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home':
        return 'home';
      case 'work':
        return 'business';
      case 'favorite':
        return 'heart';
      default:
        return 'time';
    }
  };

  const renderSuggestionItem = ({ item }: { item: PlaceSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <View style={styles.suggestionIcon}>
        <Ionicons name="location-outline" size={20} color="#666" />
      </View>
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionMainText} numberOfLines={1}>
          {item.structuredFormatting.main_text}
        </Text>
        <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
          {item.structuredFormatting.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSavedAddressItem = ({ item }: { item: SavedAddress }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSavedAddressPress(item)}
    >
      <View style={styles.suggestionIcon}>
        <Ionicons name={getAddressIcon(item.type)} size={20} color="#666" />
      </View>
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionMainText} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const getCurrentLocationItem = () => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={handleCurrentLocationPress}
    >
      <View style={styles.suggestionIcon}>
        <Ionicons name="navigate" size={20} color="#007AFF" />
      </View>
      <View style={styles.suggestionText}>
        <Text style={[styles.suggestionMainText, { color: '#007AFF' }]}>
          Use Current Location
        </Text>
        <Text style={styles.suggestionSecondaryText}>
          GPS location
        </Text>
      </View>
    </TouchableOpacity>
  );

  const shouldShowSavedAddresses = searchText.length === 0 && savedAddresses.length > 0 && showRecentAddresses;
  const shouldShowCurrentLocation = searchText.length === 0 && showCurrentLocationButton;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <View style={styles.searchIcon}>
          <Ionicons name="search" size={20} color="#666" />
        </View>
        
        <TextInput
          ref={inputRef}
          style={[styles.textInput, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
        
        {searchText.length > 0 && !loading && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && (
        <Animated.View
          style={[
            styles.suggestionsContainer,
            listStyle,
            {
              opacity: animatedHeight,
              transform: [
                {
                  scaleY: animatedHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => item.placeId}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                {shouldShowCurrentLocation && getCurrentLocationItem()}
                {shouldShowSavedAddresses && (
                  <View>
                    <Text style={styles.sectionHeader}>Recent & Saved</Text>
                    <FlatList
                      data={savedAddresses}
                      renderItem={renderSavedAddressItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  </View>
                )}
                {suggestions.length > 0 && searchText.length > 0 && (
                  <Text style={styles.sectionHeader}>Search Results</Text>
                )}
              </View>
            }
            style={[styles.suggestionsList, { maxHeight: 300 }]}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  loadingContainer: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionIcon: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
});

export default AddressSearchInput;