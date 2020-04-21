/**
 * This is a reactnavigation SCREEN to which we navigate,
 * when we need to fetch a PIN from a user.
 */
import colors from '@celo/react-components/styles/colors'
import * as React from 'react'
import { WithTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import SafeAreaView from 'react-native-safe-area-view'
import { NavigationInjectedProps } from 'react-navigation'
import { connect } from 'react-redux'
import { showError } from 'src/alert/actions'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { Namespaces, withTranslation } from 'src/i18n'
import { nuxNavigationOptions } from 'src/navigator/Headers'
import Pincode from 'src/pincode/Pincode'
import { isPinCorrect, isPinValid, PIN_LENGTH } from 'src/pincode/utils'
import { RootState } from 'src/redux/reducers'
import { currentAccountSelector, fornoSelector } from 'src/web3/selectors'
import Logger from 'src/utils/Logger'

interface State {
  pin: string
}

interface StateProps {
  currentAccount: string | null
  fornoMode: boolean
}

interface DispatchProps {
  showError: typeof showError
}

type Props = StateProps & DispatchProps & WithTranslation & NavigationInjectedProps

class PincodeEnter extends React.Component<Props, State> {
  static navigationOptions = { gesturesEnabled: false, ...nuxNavigationOptions }

  state = {
    pin: '',
  }

  onChangePin = (pin: string) => {
    this.setState({ pin })
  }

  onCorrectPin = (pin: string) => {
    Logger.debug('PincodeEnter', 'onCorrectPin')
    const onSuccess = this.props.navigation.getParam('onSuccess')
    if (onSuccess) {
      onSuccess(pin)
    }
  }

  onWrongPin = () => {
    Logger.debug('PincodeEnter', 'onWrongPin')
    this.props.showError(ErrorMessages.INCORRECT_PIN)
    this.setState({ pin: '' })
  }

  onPressConfirm = () => {
    Logger.debug('PincodeEnter', 'onPressConfirm')

    const { fornoMode, navigation, currentAccount } = this.props
    const { pin } = this.state
    const withVerification = navigation.getParam('withVerification')
    if (withVerification && currentAccount) {
      isPinCorrect(pin, fornoMode, currentAccount)
        .then(this.onCorrectPin)
        .catch(this.onWrongPin)
    } else {
      this.onCorrectPin(pin)
    }
  }

  render() {
    const { t } = this.props
    const { pin } = this.state
    Logger.debug('PincodeEnter', `pin: ${pin}`)
    return (
      <SafeAreaView style={style.container}>
        <Pincode
          title={t('confirmPin.title')}
          placeholder={t('createPin.yourPin')}
          buttonText={t('global:submit')}
          isPinValid={isPinValid}
          onPress={this.onPressConfirm}
          pin={pin}
          onChangePin={this.onChangePin}
          maxLength={PIN_LENGTH}
        />
      </SafeAreaView>
    )
  }
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
})

const mapStateToProps = (state: RootState): StateProps => ({
  currentAccount: currentAccountSelector(state),
  fornoMode: fornoSelector(state),
})

export default connect(mapStateToProps, { showError })(
  withTranslation(Namespaces.nuxNamePin1)(PincodeEnter)
)
