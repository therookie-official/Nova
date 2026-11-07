import { Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors } from '@/theme/tokens';

interface TextFieldProps extends Pick<
  TextInputProps,
  'autoCapitalize' | 'keyboardType' | 'multiline' | 'autoCorrect'
> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  testID?: string;
}

/** Labelled text input with large type. The label is always visible, not just a placeholder. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  testID,
  multiline,
  ...rest
}: TextFieldProps) {
  return (
    <View>
      <Text className="mb-2 text-base font-semibold text-text">{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        testID={testID}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-button border bg-surface px-4 text-base text-text ${
          error ? 'border-danger' : 'border-border'
        } ${multiline ? 'min-h-[120px] py-3' : 'min-h-[52px]'}`}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-2 text-base text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-2 text-sm text-textMuted">{hint}</Text>
      ) : null}
    </View>
  );
}
